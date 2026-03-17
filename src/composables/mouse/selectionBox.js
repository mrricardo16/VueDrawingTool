/**
 * 根据屏幕框选区域计算世界坐标包围盒。
 */
export function toWorldSelectionBox(selectionStart, selectionEnd, offset, scale) {
  if (!selectionStart || !selectionEnd) return null

  const ox = offset?.x || 0
  const oy = offset?.y || 0
  const x1 = Math.min(selectionStart.x, selectionEnd.x)
  const y1 = Math.min(selectionStart.y, selectionEnd.y)
  const x2 = Math.max(selectionStart.x, selectionEnd.x)
  const y2 = Math.max(selectionStart.y, selectionEnd.y)

  return {
    x1: (x1 - ox) / scale,
    y1: -(y2 - oy) / scale,
    x2: (x2 - ox) / scale,
    y2: -(y1 - oy) / scale
  }
}

/**
 * 根据世界坐标框选区域收集选中元素 ID。
 * 行为保持与原组件一致：
 * - 线/曲线只检查端点是否在框内
 * - 区域检查任一顶点是否在框内
 */
export function collectSelectionIdsByBox({
  box,
  points,
  lines,
  bsplines,
  texts,
  areas,
  getPointById,
  isElementInVisibleLayer
}) {
  const inBox = (x, y) => x >= box.x1 && x <= box.x2 && y >= box.y1 && y <= box.y2

  const selectedPoints = []
  const selectedLines = []
  const selectedTexts = []
  const selectedAreas = []

  for (const p of points) {
    if (isElementInVisibleLayer(p) && inBox(p.x, p.y)) {
      selectedPoints.push(p.id)
    }
  }

  for (const line of lines) {
    if (!isElementInVisibleLayer(line)) continue
    const sp = getPointById(line.startPointId)
    const ep = getPointById(line.endPointId)
    if (!sp || !ep) continue
    if (inBox(sp.x, sp.y) || inBox(ep.x, ep.y)) {
      selectedLines.push(line.id)
    }
  }

  for (const b of bsplines) {
    if (!isElementInVisibleLayer(b)) continue
    const sp = getPointById(b.startPointId)
    const ep = getPointById(b.endPointId)
    if (!sp || !ep) continue
    if (inBox(sp.x, sp.y) || inBox(ep.x, ep.y)) {
      selectedLines.push(b.id)
    }
  }

  for (const t of texts) {
    if (isElementInVisibleLayer(t) && inBox(t.x, t.y)) {
      selectedTexts.push(t.id)
    }
  }

  for (const area of areas) {
    if (!isElementInVisibleLayer(area)) continue
    if (!area.points?.length) continue
    if (area.points.some((p) => inBox(p.x, p.y))) {
      selectedAreas.push(area.id)
    }
  }

  return {
    points: selectedPoints,
    lines: selectedLines,
    texts: selectedTexts,
    areas: selectedAreas
  }
}
