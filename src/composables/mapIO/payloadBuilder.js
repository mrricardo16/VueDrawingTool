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
export function buildServerPayloadData({ points, lines, bsplines, texts, areas, resolveLayerName }) {
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
    payload.Sites[point.id] = siteData
  })

  lines.forEach(line => {
    const origDir = line._direction ?? (line.mode === 'bidirectional' ? 0 : 1)
    const isReverse = origDir === 2
    payload.Tracks[line.id] = {
      trackType: 1,
      StartSite: isReverse ? line.endPointId : line.startPointId,
      ControlPoints: '0',
      _siteA: isReverse ? line.endPointId : line.startPointId,
      _siteB: isReverse ? line.startPointId : line.endPointId,
      direction: origDir,
      typeInfo: '0',
      id: line.id,
      layerName: resolveLayerName(line),
      name: line.name || 'NoName',
      fields: line.fields || {},
      siteA: isReverse ? line.endPointId : line.startPointId,
      siteB: isReverse ? line.startPointId : line.endPointId
    }
  })

  bsplines.forEach(bspline => {
    const origDir = bspline._direction ?? (bspline.mode === 'bidirectional' ? 0 : 1)
    const isReverse = origDir === 2
    const cpArr = isReverse
      ? [...bspline.controlPoints].reverse().map(cp => ({ x: cp.x, y: cp.y, site: cp.site ?? -1 }))
      : bspline.controlPoints.map(cp => ({ x: cp.x, y: cp.y, site: cp.site ?? -1 }))
    payload.Curves[bspline.id] = {
      trackType: 3,
      siteA_TH: '0',
      siteB_TH: '0',
      maxWheelbase: '0',
      displaySetting: '',
      StartSite: isReverse ? bspline.endPointId : bspline.startPointId,
      _siteA: isReverse ? bspline.endPointId : bspline.startPointId,
      _siteB: isReverse ? bspline.startPointId : bspline.endPointId,
      direction: origDir,
      typeInfo: '0',
      id: bspline.id,
      layerName: resolveLayerName(bspline),
      name: bspline.name || 'NoName',
      fields: bspline.fields || {},
      siteA: isReverse ? bspline.endPointId : bspline.startPointId,
      siteB: isReverse ? bspline.startPointId : bspline.endPointId,
      maxWheelbaseOutput: 1000.0,
      StartTH: 0.0,
      EndTH: 0.0,
      Order: cpArr.length,
      ControlPoints: cpArr
    }
  })

  texts.forEach(text => {
    payload.Text[text.id] = {
      id: text.id,
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
    payload.Area[area.id] = {
      id: area.id,
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
