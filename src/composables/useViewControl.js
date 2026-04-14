/**
 * useViewControl.js
 * 视图控制（适配、重置）及从属性面板定位到元素的逻辑，从 App.vue 中提取。
 */

/**
 * @param {any} drawingCanvas
 * @param {any} pointById
 * @param {any} lineById
 * @param {any} textById
 * @param {any} bsplineById
 * @param {any} areas
 */

export function useViewControl(drawingCanvas, pointById, lineById, textById, bsplineById, areas) {
  // 响应式访问：每次都取最新的 Map，避免 stale 引用导致元素找不到
  /** @returns {Map<any, any>} */
  const getPointMap = () => pointById.value
  /** @returns {Map<any, any>} */
  const getLineMap = () => lineById.value
  /** @returns {Map<any, any>} */
  const getTextMap = () => textById.value
  /** @returns {Map<any, any>} */
  const getBsplineMap = () => bsplineById.value

  // ─── 基础视图操作 ──────────────────────────────────────────────────────

  /** 自适应全部点位到当前视口 */
  const handleFitView = () => {
    if (drawingCanvas.value?.canvas) drawingCanvas.value.fitToView()
  }

  /** 重置缩放与偏移 */
  const handleResetView = () => {
    const dc = drawingCanvas.value
    if (dc?.canvas) {
      dc.scale = 1
      dc.offset = { x: 0, y: 0 }
      dc.redraw()
    }
  }

  // ─── 计算元素包围盒 ──────────────────────────────────────────────────────

  /**
  * @param {'point'|'text'|'line'|'curve'|'area'} type
   * @param {number|string} elementId
   * @returns {{centerX:number,centerY:number}|null}
   */
  const computeElementBounds = (type, elementId) => {
    const pointMap = getPointMap()
    const lineMap = getLineMap()
    const textMap = getTextMap()
    const bsplineMap = getBsplineMap()
    if (type === 'point') {
      const p = pointMap.get(elementId)
      if (!p) return null
      return { centerX: p.x, centerY: p.y }
    }
    if (type === 'text') {
      const t = textMap.get(elementId)
      if (!t) return null
      return { centerX: t.x, centerY: t.y }
    }
    if (type === 'line') {
      const line = lineMap.get(elementId)
      if (!line) return null
      const sp = pointMap.get(line.startPointId)
      const ep = pointMap.get(line.endPointId)
      if (!sp || !ep) return null
      return { centerX: (sp.x + ep.x) / 2, centerY: (sp.y + ep.y) / 2 }
    }
    if (type === 'curve') {
      const curve = bsplineMap.get(elementId)
      if (!curve) return null
      const sp = pointMap.get(curve.startPointId)
      const ep = pointMap.get(curve.endPointId)
      if (!sp || !ep) return null

      let minX = Math.min(sp.x, ep.x), maxX = Math.max(sp.x, ep.x)
      let minY = Math.min(sp.y, ep.y), maxY = Math.max(sp.y, ep.y)
      const ctrlPts = curve.controlPoints?.length
        ? curve.controlPoints
        : (curve.controlPointIds || []).map(id => pointMap.get(id)).filter(Boolean)

      if (ctrlPts.length) {
        ctrlPts.forEach(p => {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
        })
      }
      return { centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 }
    }

    if (type === 'area') {
      const areaList = areas?.value || []
      const area = areaList.find(a => a.id === elementId)
      if (!area?.points?.length) return null

      let minX = Infinity, maxX = -Infinity
      let minY = Infinity, maxY = -Infinity
      area.points.forEach(p => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      })
      return { centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 }
    }
    return null
  }

  // ─── 定位到元素 ──────────────────────────────────────────────────────────

  /**
   * 聚焦到指定元素中心
  * @param {'point'|'text'|'line'|'curve'|'area'} type
   * @param {number|string} elementId
   */
  const focusOnElement = (type, elementId) => {
    const bounds = computeElementBounds(type, elementId)
    if (!bounds) return

    const dc = drawingCanvas.value
    if (!dc?.canvas) return

    const canvas = dc.canvas
    const currentScale = dc.scale || 1
    const newOffsetX = canvas.width / 2 - bounds.centerX * currentScale
    const newOffsetY = canvas.height / 2 + bounds.centerY * currentScale

    if (dc.__focusRafId) {
      cancelAnimationFrame(dc.__focusRafId)
      dc.__focusRafId = null
    }
    dc.__focusRafId = requestAnimationFrame(() => {
      dc.offset = { x: newOffsetX, y: newOffsetY }
      dc.redraw()
      dc.__focusRafId = null
    })
  }

  return {
    handleFitView,
    handleResetView,
    computeElementBounds,
    focusOnElement,
    
  }
}
