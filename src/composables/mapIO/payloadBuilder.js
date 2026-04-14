/**
 * payloadBuilder.js
 *
 * 优化注释：
 * - 增加了模块职责的简洁说明。
 * - 为每个方法补充了更详细的参数和返回值描述。
 * - 对数据构建逻辑的关键步骤进行了注释。
 */

/**
 * useMapIO 数据构建工具
 */

/**
 * @typedef {import('../../models/types').Point} Point
 * @typedef {import('../../models/types').Line} Line
 * @typedef {import('../../models/types').BSpline} BSpline
 * @typedef {import('../../models/types').TextElement} TextElement
 * @typedef {import('../../models/types').Area} Area
 */

/**
 * 方法说明：
 * - getSiteType: 根据字段信息推断站点类型。
 * - buildLocalMapData: 构建本地地图数据对象，包含站点、轨迹、曲线、文本和区域。
 */

/**
 * @param {Record<string, any>|undefined|null} fields
 * @returns {string}
 */
export function getSiteType(fields) {
  if (!fields) return 'point'
  if (fields.charge === 'true') return 'charging'
  if (fields.standby === 'true') return 'rest'
  if (fields.shelf === 'true') return 'site'
  if (fields.escape === 'true') return 'escape'
  if (fields.stagingSite === 'true') return 'staging'
  return 'point'
}

/**
 * @param {{
 * points: Point[],
 * lines: Line[],
 * bsplines: BSpline[],
 * texts: TextElement[],
 * areas: Area[],
 * resolveLayerName:(element:any)=>string
 * }} deps
 */
export function buildLocalMapData({ points, lines, bsplines, texts, areas, resolveLayerName }) {
  const mapData = { Sites: {}, Tracks: {}, Curves: {}, Text: {}, Area: {} }

  points.forEach(point => {
    const siteData = {
      id: point.id,
      name: point.name || 'NoName',
      color: point.color || '',
      angle: point.angle || 0.0,
      x: point.x,
      y: point.y,
      layername: resolveLayerName(point),
      fields: { ...(point.fields || {}) },
      mustFree: point.mustFree || []
    }
    switch (point.type) {
      case 'charging':
        siteData.fields.charge = 'true'
        siteData.fields.codeArrive = 'agv.ActionCharge(true)'
        siteData.fields.codeLeave = 'agv.ActionCharge(false)'
        break
      case 'rest':
        siteData.fields.standby = 'true'
        break
      case 'site':
        siteData.fields.shelf = 'true'
        siteData.fields.loopid = 'default'
        siteData.fields.heights = '[300,400]'
        break
      case 'escape':
        siteData.fields.escape = 'true'
        break
      case 'staging':
        siteData.fields.stagingSite = 'true'
        break
    }
    mapData.Sites[point.id] = siteData
  })

  lines.forEach(line => {
    mapData.Tracks[line.id] = {
      trackType: 1,
      StartSite: line.startPointId,
      ControlPoints: '0',
      _siteA: line.startPointId,
      _siteB: line.endPointId,
      direction: line.mode === 'bidirectional' ? 0 : 1,
      typeInfo: '0',
      id: line.id,
      layerName: resolveLayerName(line),
      name: line.name || 'NoName',
      fields: line.fields || {},
      siteA: line.startPointId,
      siteB: line.endPointId
    }
  })

  bsplines.forEach(bspline => {
    const cpArr = bspline.controlPoints.map(cp => ({ x: cp.x, y: cp.y, site: -1 }))
    mapData.Curves[bspline.id] = {
      trackType: 3,
      siteA_TH: '0',
      siteB_TH: '0',
      maxWheelbase: '0',
      displaySetting: '',
      StartSite: bspline.startPointId,
      _siteA: bspline.startPointId,
      _siteB: bspline.endPointId,
      direction: bspline.mode === 'bidirectional' ? 0 : 1,
      typeInfo: '0',
      id: bspline.id,
      layerName: resolveLayerName(bspline),
      name: bspline.name || 'NoName',
      fields: bspline.fields || {},
      siteA: bspline.startPointId,
      siteB: bspline.endPointId,
      maxWheelbaseOutput: 1000.0,
      StartTH: 0.0,
      EndTH: 0.0,
      Order: bspline.controlPoints.length,
      ControlPoints: cpArr
    }
  })

  texts.forEach(text => {
    mapData.Text[text.id] = {
      id: text.id,
      name: text.name,
      layername: resolveLayerName(text),
      fields: text.fields || {},
      x: text.x,
      y: text.y,
      color: text.color,
      fontSize: text.fontSize
    }
  })

  areas.forEach(area => {
    mapData.Area[area.id] = {
      id: area.id,
      layerName: resolveLayerName(area),
      name: area.name || 'NoName',
      opacity: area.opacity || 50,
      color: area.color || '#FFFFFF',
      fields: area.fields || {},
      carNum: area.carNum || 0,
      points: area.points || []
    }
  })

  return mapData
}

/**
 * @param {{
 * points: Point[],
 * lines: Line[],
 * bsplines: BSpline[],
 * texts: TextElement[],
 * areas: Area[],
 * resolveLayerName:(element:any)=>string
 * }} deps
 */
import { reserveLegacyId } from '../../utils/idGenerator.js'

export function buildServerPayloadData({ points, lines, bsplines, texts, areas, resolveLayerName }) {
  const MAX_INT32 = 2147483647

  const normalizeId = (rawId) => {
    if (rawId === undefined || rawId === null) return rawId
    const asNum = (typeof rawId === 'number') ? rawId : (typeof rawId === 'string' ? parseInt(rawId, 10) : NaN)
    if (!Number.isNaN(asNum) && Math.abs(asNum) <= MAX_INT32) return String(asNum)
    // legacy or out-of-range -> reserve mapping
    try {
      return String(reserveLegacyId(String(rawId)))
    } catch (e) {
      console.warn('normalizeId: reserveLegacyId failed for', rawId, e)
      return String(rawId)
    }
  }
  const payload = {
    Sites: {}, Tracks: {}, Curves: {}, Text: {}, Area: {}, Cars: {},
    conf: {
      useEnvelope: true,
      useReachability: true,
      PRICE_RANGE: 10000.0,
      fields: {}
    },
    Missions: {}
  }

  points.forEach(point => {
    const nid = normalizeId(point.id)
    const siteData = {
      id: nid,
      name: point.name || 'NoName',
      color: point.color || '',
      angle: point.angle || 0.0,
      x: point.x,
      y: point.y,
      layername: resolveLayerName(point),
      fields: { ...(point.fields || {}) },
      mustFree: point.mustFree || []
    }
    switch (point.type) {
      case 'charging':
        siteData.fields.charge = 'true'
        siteData.fields.codeArrive = 'agv.ActionCharge(true)'
        siteData.fields.codeLeave = 'agv.ActionCharge(false)'
        break
      case 'rest':
        siteData.fields.standby = 'true'
        break
      case 'site':
        siteData.fields.shelf = 'true'
        siteData.fields.loopid = siteData.fields.loopid || 'default'
        siteData.fields.heights = siteData.fields.heights || '[300,400]'
        break
      case 'escape':
        siteData.fields.escape = 'true'
        break
      case 'staging':
        siteData.fields.stagingSite = 'true'
        break
    }
    payload.Sites[nid] = siteData
  })

  lines.forEach(line => {
    const lid = normalizeId(line.id)
    const origDir = line._direction ?? (line.mode === 'bidirectional' ? 0 : 1)
    const isReverse = origDir === 2
    const startSite = normalizeId(isReverse ? line.endPointId : line.startPointId)
    const endSite = normalizeId(isReverse ? line.startPointId : line.endPointId)
    payload.Tracks[lid] = {
      trackType: 1,
      StartSite: startSite,
      ControlPoints: '0',
      _siteA: startSite,
      _siteB: endSite,
      direction: origDir,
      typeInfo: '0',
      id: lid,
      layerName: resolveLayerName(line),
      name: line.name || 'NoName',
      fields: line.fields || {},
      siteA: startSite,
      siteB: endSite
    }
  })

  bsplines.forEach(bspline => {
    const bid = normalizeId(bspline.id)
    const origDir = bspline._direction ?? (bspline.mode === 'bidirectional' ? 0 : 1)
    const isReverse = origDir === 2
    const rawCp = isReverse ? [...bspline.controlPoints].reverse() : bspline.controlPoints
    const cpArr = rawCp.map(cp => ({ x: cp.x, y: cp.y, site: (cp.site == null ? -1 : parseInt(normalizeId(cp.site), 10)) }))
    const startSite = normalizeId(isReverse ? bspline.endPointId : bspline.startPointId)
    const endSite = normalizeId(isReverse ? bspline.startPointId : bspline.endPointId)
    payload.Curves[bid] = {
      trackType: 3,
      siteA_TH: '0',
      siteB_TH: '0',
      maxWheelbase: '0',
      displaySetting: '',
      StartSite: startSite,
      _siteA: startSite,
      _siteB: endSite,
      direction: origDir,
      typeInfo: '0',
      id: bid,
      layerName: resolveLayerName(bspline),
      name: bspline.name || 'NoName',
      fields: bspline.fields || {},
      siteA: startSite,
      siteB: endSite,
      maxWheelbaseOutput: 1000.0,
      StartTH: 0.0,
      EndTH: 0.0,
      Order: cpArr.length,
      ControlPoints: cpArr
    }
  })

  texts.forEach(text => {
    const tid = normalizeId(text.id)
    payload.Text[tid] = {
      id: tid,
      name: text.name || '',
      layername: resolveLayerName(text),
      fields: text.fields || {},
      x: text.x,
      y: text.y,
      color: text.color || '#ffffff',
      fontSize: text.fontSize || 36
    }
  })

  areas.forEach(area => {
    const aid = normalizeId(area.id)
    payload.Area[aid] = {
      id: aid,
      layerName: resolveLayerName(area),
      name: area.name || 'NoName',
      opacity: area.opacity ?? 50,
      color: area.color || '#FFFFFF',
      fields: area.fields || {},
      carNum: area.carNum || 0,
      points: area.points || []
    }
  })

  return payload
}
