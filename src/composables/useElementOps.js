/**
 * useElementOps.js
 * 元素的增删改操作，从 App.vue 的 setup() 中提取。
 */
import { useLayerStore } from '../stores/layerStore.js'
import { nextId } from '../utils/idGenerator.js'

/**
 * @typedef {import('../models/types').Point} Point
 * @typedef {import('../models/types').Line} Line
 * @typedef {import('../models/types').BSpline} BSpline
 * @typedef {import('../models/types').TextElement} TextElement
 * @typedef {import('../models/types').Area} Area
 */

/**
 * @param {{
 * points:any,
 * lines:any,
 * bsplines:any,
 * texts:any,
 * areas:any,
 * selectedPoints:any,
 * selectedLines:any,
 * selectedTexts:any,
 * selectedAreas:any,
 * pointById:any,
 * lineById:any,
 * textById:any,
 * bsplineById:any,
 * record:(op:string,payload:any)=>void,
 * HistoryOp:Record<string,string>,
 * cloneElement:<T>(el:T)=>T,
 * rebuildIdMaps:()=>void
 * }} deps
 */
export function useElementOps({
  points, lines, bsplines, texts, areas,
  selectedPoints, selectedLines, selectedTexts, selectedAreas,
  pointById, lineById, textById, bsplineById,
  record,
  HistoryOp,
  cloneElement,
  rebuildIdMaps
}) {
  // ─── 图层管理────────────────────────────────────────────────────────────
  const layerStore = useLayerStore()

  // ─── 删除 ────────────────────────────────────────────────────────────────

  /** 删除当前选中元素（点/线/曲线/文本/区域）并写入混合删除历史 */
  const handleDeleteSelected = () => {
    const selPointIds = [...selectedPoints.value]
    const selLineIds = [...selectedLines.value]
    const selTextIds = [...selectedTexts.value]
    const selAreaIds = [...selectedAreas.value]

    // 收集被删除元素（用于撤回恢复）
    const deletedTexts = selTextIds.length ? texts.value.filter(t => selTextIds.includes(t.id)).map(cloneElement) : []
    const deletedAreas = selAreaIds.length ? areas.value.filter(a => selAreaIds.includes(a.id)).map(cloneElement) : []

    const deletedPoints = selPointIds.length ? points.value.filter(p => selPointIds.includes(p.id)).map(cloneElement) : []

    // 先推断将被删除的 bspline
    const bsplineToDeleteIds = new Set()
    if (selLineIds.length > 0) {
      for (const b of bsplines.value) {
        if (selLineIds.includes(b.id)) { bsplineToDeleteIds.add(b.id); continue }
        if (b.startPointId && b.endPointId) {
          if (selPointIds.includes(b.startPointId) || selPointIds.includes(b.endPointId)) { bsplineToDeleteIds.add(b.id); continue }
          if (b.controlPointIds?.some(id => selPointIds.includes(id))) { bsplineToDeleteIds.add(b.id); continue }
        } else if (b.pointIds?.some(id => selPointIds.includes(id))) {
          bsplineToDeleteIds.add(b.id)
        }
      }
    }

    if (selPointIds.length > 0) {
      // 点删除导致相关线删除
      for (const l of lines.value) {
        if (selPointIds.includes(l.startPointId) || selPointIds.includes(l.endPointId)) {
          selLineIds.push(l.id)
        }
      }
      for (const b of bsplines.value) {
        if (b.startPointId && b.endPointId) {
          if (selPointIds.includes(b.startPointId) || selPointIds.includes(b.endPointId)) { bsplineToDeleteIds.add(b.id); continue }
          if (b.controlPointIds?.some(id => selPointIds.includes(id))) { bsplineToDeleteIds.add(b.id); continue }
        } else if (b.pointIds?.some(id => selPointIds.includes(id))) {
          bsplineToDeleteIds.add(b.id)
        }
      }
    }

    // selLineIds 可能包含重复项（来自“点删除级联”），记录与删除前先去重
    const uniqueLineIds = [...new Set(selLineIds)]
    const deletedLines = uniqueLineIds.length
      ? lines.value.filter(l => uniqueLineIds.includes(l.id)).map(cloneElement)
      : []

    const deletedBsplines = bsplineToDeleteIds.size
      ? bsplines.value.filter(b => bsplineToDeleteIds.has(b.id)).map(cloneElement)
      : []

    if (
      deletedPoints.length || deletedLines.length || deletedBsplines.length || deletedTexts.length || deletedAreas.length
    ) {
      record(HistoryOp.DELETE_MIXED, {
        pointIds: selPointIds,
        lineIds: uniqueLineIds,
        bsplineIds: [...bsplineToDeleteIds],
        textIds: selTextIds,
        areaIds: selAreaIds,
        points: deletedPoints,
        lines: deletedLines,
        bsplines: deletedBsplines,
        texts: deletedTexts,
        areas: deletedAreas
      })
    }

    // 删除区域
    if (selAreaIds.length > 0) {
      areas.value = areas.value.filter(a => !selAreaIds.includes(a.id))
    }

    // 删除文本
    if (selectedTexts.value.length > 0) {
      texts.value = texts.value.filter(t => !selectedTexts.value.includes(t.id))
    }

    // 删除线（含相关 B 样条）
    if (selectedLines.value.length > 0) {
      lines.value = lines.value.filter(l => !selectedLines.value.includes(l.id))
      bsplines.value = bsplines.value.filter(b => {
        if (selectedLines.value.includes(b.id)) return false
        if (b.startPointId && b.endPointId) {
          if (selectedPoints.value.includes(b.startPointId) || selectedPoints.value.includes(b.endPointId)) return false
          if (b.controlPointIds?.some(id => selectedPoints.value.includes(id))) return false
          return true
        }
        return !b.pointIds?.some(id => selectedPoints.value.includes(id))
      })
    }

    // 删除点（及相关线/B 样条）
    if (selectedPoints.value.length > 0) {
      points.value = points.value.filter(p => !selectedPoints.value.includes(p.id))
      lines.value = lines.value.filter(l =>
        !selectedPoints.value.includes(l.startPointId) && !selectedPoints.value.includes(l.endPointId)
      )
      bsplines.value = bsplines.value.filter(b => {
        if (b.startPointId && b.endPointId) {
          if (selectedPoints.value.includes(b.startPointId) || selectedPoints.value.includes(b.endPointId)) return false
          if (b.controlPointIds?.some(id => selectedPoints.value.includes(id))) return false
          return true
        }
        return !b.pointIds?.some(id => selectedPoints.value.includes(id))
      })
    }

    selectedPoints.value = []
    selectedLines.value = []
    selectedTexts.value = []
    selectedAreas.value = []
    
    // 重建索引 Map，确保与数组同步
    rebuildIdMaps()
  }

  // ─── 更新 ────────────────────────────────────────────────────────────────

  /** @param {Point} updatedPoint */
  const handleUpdatePoint = (updatedPoint) => {
    const idx = points.value.findIndex(p => p.id === updatedPoint.id)
    if (idx !== -1) {
      const before = cloneElement(points.value[idx])
      points.value[idx] = { ...updatedPoint }
      pointById.value.set(updatedPoint.id, points.value[idx])
      const after = cloneElement(points.value[idx])
      record(HistoryOp.UPDATE, { kind: 'points', before: [before], after: [after] })
    }
  }

  /** @param {Line} updatedLine */
  const handleUpdateLine = (updatedLine) => {
    const idx = lines.value.findIndex(l => l.id === updatedLine.id)
    if (idx !== -1) {
      const before = cloneElement(lines.value[idx])
      lines.value[idx] = { ...updatedLine }
      lineById.value.set(updatedLine.id, lines.value[idx])
      const after = cloneElement(lines.value[idx])
      record(HistoryOp.UPDATE, { kind: 'lines', before: [before], after: [after] })
    }
  }

  /** @param {TextElement} updatedText */
  const handleUpdateText = (updatedText) => {
    const idx = texts.value.findIndex(t => t.id === updatedText.id)
    if (idx !== -1) {
      const before = cloneElement(texts.value[idx])
      texts.value[idx] = { ...updatedText }
      textById.value.set(updatedText.id, texts.value[idx])
      const after = cloneElement(texts.value[idx])
      record(HistoryOp.UPDATE, { kind: 'texts', before: [before], after: [after] })
    }
  }

  /** @param {BSpline} updatedCurve */
  const handleUpdateCurve = (updatedCurve) => {
    const idx = bsplines.value.findIndex(b => b.id === updatedCurve.id)
    if (idx !== -1) {
      const before = cloneElement(bsplines.value[idx])
      bsplines.value[idx] = { ...updatedCurve }
      bsplineById.value.set(updatedCurve.id, bsplines.value[idx])
      const after = cloneElement(bsplines.value[idx])
      record(HistoryOp.UPDATE, { kind: 'bsplines', before: [before], after: [after] })
    }
  }

  /** @param {Area} updatedArea */
  const handleUpdateArea = (updatedArea) => {
    const idx = areas.value.findIndex(a => a.id === updatedArea.id)
    if (idx !== -1) {
      const before = cloneElement(areas.value[idx])
      areas.value[idx] = { ...updatedArea }
      const after = cloneElement(areas.value[idx])
      record(HistoryOp.UPDATE, { kind: 'areas', before: [before], after: [after] })
    }
  }

  /**
   * 锚点拖拽结束时调用：接受显式的 before 快照（mousedown 时采集）。
   * 原因：拖拽过程中已就地修改了 bspline.controlPoints[i].x/y，
   * 若再读取 bsplines.value[idx] 作为 before，拿到的已经是修改后的值。
   * 调用方（AnchorEditHandler）在 mousedown 时保存快照传入此方法。
   */
  /**
   * @param {number|string} bsplineId
   * @param {BSpline} beforeSnapshot
   */
  const handleCurveAnchorDragEnd = (bsplineId, beforeSnapshot) => {
    const idx = bsplines.value.findIndex(b => b.id === bsplineId)
    if (idx === -1) return
    // 就地修改已完成，after 直接从当前状态克隆
    const after = cloneElement(bsplines.value[idx])
    // 触发数组引用替换，使 watcher 检测到变化并重建空间网格
    bsplines.value = [...bsplines.value]
    record(HistoryOp.UPDATE, { kind: 'bsplines', before: [beforeSnapshot], after: [after] })
  }

  /**
   * 区域顶点拖拽结束时调用：同上，接受显式 before 快照。
   */
  /**
   * @param {number|string} areaId
   * @param {Area} beforeSnapshot
   */
  const handleAreaAnchorDragEnd = (areaId, beforeSnapshot) => {
    const idx = areas.value.findIndex(a => a.id === areaId)
    if (idx === -1) return
    const after = cloneElement(areas.value[idx])
    areas.value = [...areas.value]
    record(HistoryOp.UPDATE, { kind: 'areas', before: [beforeSnapshot], after: [after] })
  }

  // ─── 添加 ────────────────────────────────────────────────────────────────

  /** @param {Point} point */
  const handlePointAdded = (point) => {
    // 点已经在MouseEventHandler中分配了图层，直接添加
    points.value.push(point)
    pointById.value.set(point.id, point)
    record(HistoryOp.ADD, { kind: 'points', ids: [point.id], items: [cloneElement(point)] })
  }

  /** @param {Line} line */
  const handleLineCreated = (line) => {
    if (import.meta.env.DEV) console.log('🔍 DEBUG: useElementOps: handleLineCreated', { lineMode: line.mode, line })
    // 将新线分配到当前所有可见图层
    const lineWithLayer = layerStore.assignElementToVisibleLayers(line)
    if (import.meta.env.DEV) console.log('🔍 DEBUG: Line with layers', lineWithLayer)
    lines.value.push(lineWithLayer)
    lineById.value.set(lineWithLayer.id, lineWithLayer)
    record(HistoryOp.ADD, { kind: 'lines', ids: [lineWithLayer.id], items: [cloneElement(lineWithLayer)] })
    if (import.meta.env.DEV) console.log('🔍 DEBUG: Line added to store', { totalLines: lines.value.length })
  }

  /** @param {BSpline} bspline */
  const handleBsplineCreated = (bspline) => {
    // 将新B样条分配到当前所有可见图层
    const bsplineWithLayer = layerStore.assignElementToVisibleLayers(bspline)
    bsplines.value.push(bsplineWithLayer)
    bsplineById.value.set(bsplineWithLayer.id, bsplineWithLayer)
    record(HistoryOp.ADD, { kind: 'bsplines', ids: [bsplineWithLayer.id], items: [cloneElement(bsplineWithLayer)] })
  }

  /** @param {TextElement} text */
  const handleTextAdded = (text) => {
    const existingIdx = texts.value.findIndex(t => t.id === text.id)
    if (existingIdx !== -1) {
      const before = cloneElement(texts.value[existingIdx])
      texts.value[existingIdx] = text
      textById.value.set(text.id, texts.value[existingIdx])
      const after = cloneElement(texts.value[existingIdx])
      record(HistoryOp.UPDATE, { kind: 'texts', before: [before], after: [after] })
    } else {
      // 将新文本分配到当前所有可见图层
      const textWithLayer = layerStore.assignElementToVisibleLayers(text)
      texts.value.push(textWithLayer)
      textById.value.set(textWithLayer.id, textWithLayer)
      record(HistoryOp.ADD, { kind: 'texts', ids: [textWithLayer.id], items: [cloneElement(textWithLayer)] })
    }
  }

  /** @param {Area} area */
  const handleAreaCreated = (area) => {
    const newArea = { ...area, id: nextId().toString() }
    // 将新区域分配到当前所有可见图层
    const areaWithLayer = layerStore.assignElementToVisibleLayers(newArea)
    areas.value.push(areaWithLayer)
    record(HistoryOp.ADD, { kind: 'areas', ids: [areaWithLayer.id], items: [cloneElement(areaWithLayer)] })
    if (import.meta.env.DEV) console.log('useElementOps: Area created', areaWithLayer)
  }

  // ─── 选中状态设置（供 MouseEventHandler 事件直接调用）───────────────────────

  /** @param {Array<number|string>} ids */
  const setSelectedPoints = (ids) => {
    selectedPoints.value = ids || []
  }

  /** @param {Array<number|string>} ids */
  const setSelectedLines = (ids) => {
    selectedLines.value = ids || []
  }

  /** @param {Array<number|string>} ids */
  const setSelectedTexts = (ids) => {
    selectedTexts.value = ids || []
  }

  /** @param {Array<number|string>} ids */
  const setSelectedAreas = (ids) => {
    selectedAreas.value = ids || []
  }

  return {
    handleDeleteSelected,
    handleUpdatePoint,
    handleUpdateLine,
    handleUpdateText,
    handleUpdateCurve,
    handleUpdateArea,
    handleCurveAnchorDragEnd,
    handleAreaAnchorDragEnd,
    handlePointAdded,
    handleLineCreated,
    handleBsplineCreated,
    handleTextAdded,
    handleAreaCreated,
    setSelectedPoints,
    setSelectedLines,
    setSelectedTexts,
    setSelectedAreas
  }
}
