export function resolveActiveBsplineForEdit({ selectedLines = [], bsplines = [] }) {
  if (selectedLines.length !== 1) return null
  const id = selectedLines[0]
  return bsplines.find(b => b.id === id) ?? null
}

export function resolveActiveBsplineStartPoint({ activeBsplineForEdit, points = [] }) {
  const b = activeBsplineForEdit
  if (!b) return null
  const startId = b.startPointId ?? b.siteA
  return points.find(p => p.id === startId) ?? null
}

export function resolveActiveBsplineEndPoint({ activeBsplineForEdit, points = [] }) {
  const b = activeBsplineForEdit
  if (!b) return null
  const endId = b.endPointId ?? b.siteB
  return points.find(p => p.id === endId) ?? null
}

export function resolveActiveAreaForEdit({ selectedAreas = [], areas = [] }) {
  if (selectedAreas.length !== 1) return null
  const id = selectedAreas[0]
  return areas.find(a => a.id === id) ?? null
}