import { CoordinateUtils } from '../../utils/coordinateUtils.js'

export function buildDraggedElements({
  points,
  lines,
  texts,
  bsplines,
  areas,
  selectedPoints,
  selectedLines,
  selectedTexts,
  selectedAreas
}) {
  const pointById = new Map(points.map((p) => [p.id, p]))
  const lineById = new Map(lines.map((l) => [l.id, l]))
  const textById = new Map(texts.map((t) => [t.id, t]))
  const areaById = new Map((areas || []).map((a) => [a.id, a]))

  const draggedPoints = selectedPoints.map((id) => pointById.get(id)).filter(Boolean)
  const draggedLines = selectedLines.map((id) => lineById.get(id)).filter(Boolean)
  const draggedTexts = selectedTexts.map((id) => textById.get(id)).filter(Boolean)
  const draggedAreas = selectedAreas.map((id) => areaById.get(id)).filter(Boolean)

  const draggedPointIds = new Set(draggedPoints.map((p) => p.id))
  const processedBsplineIds = new Set()
  const bsplineControlPoints = []

  for (const bspline of bsplines || []) {
    if (processedBsplineIds.has(bspline.id)) continue

    const startId = bspline.startPointId ?? bspline.siteA
    const endId = bspline.endPointId ?? bspline.siteB
    if (!draggedPointIds.has(startId) || !draggedPointIds.has(endId)) continue

    const cps = bspline.controlPoints ?? bspline.ControlPoints
    if (!Array.isArray(cps) || cps.length === 0) continue

    bsplineControlPoints.push(...cps)
    processedBsplineIds.add(bspline.id)
  }

  return {
    points: draggedPoints,
    lines: draggedLines,
    texts: draggedTexts,
    bsplineControlPoints,
    areas: draggedAreas
  }
}

export function applyDragDelta(draggedElements, deltaX, deltaY) {
  draggedElements.points.forEach((point) => {
    point.x += deltaX
    point.y += deltaY
  })

  draggedElements.texts.forEach((text) => {
    text.x += deltaX
    text.y += deltaY
  })

  draggedElements.bsplineControlPoints.forEach((cp) => {
    cp.x += deltaX
    cp.y += deltaY
  })

  draggedElements.areas.forEach((area) => {
    if (!Array.isArray(area.points)) return
    area.points.forEach((p) => {
      p.x += deltaX
      p.y += deltaY
    })
  })
}

export function findPointAtWorld(points, x, y, scale) {
  const threshold = CoordinateUtils.getThreshold(15, scale)
  for (const point of points) {
    const distance = CoordinateUtils.distance(point, { x, y })
    if (distance <= threshold) return point
  }
  return null
}
