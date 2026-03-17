export function resolveActiveEditorType({ selectedPoints = [], selectedLines = [], selectedTexts = [], selectedAreas = [] }) {
  const areaCount = selectedAreas?.length || 0
  const pointOnly = selectedPoints.length > 0 && selectedLines.length === 0 && selectedTexts.length === 0 && areaCount === 0
  const lineOnly = selectedLines.length > 0 && selectedPoints.length === 0 && selectedTexts.length === 0 && areaCount === 0
  const textOnly = selectedTexts.length > 0 && selectedPoints.length === 0 && selectedLines.length === 0 && areaCount === 0
  const areaOnly = areaCount === 1 && selectedPoints.length === 0 && selectedLines.length === 0 && selectedTexts.length === 0

  if (pointOnly) return 'point'
  if (lineOnly) return 'line'
  if (textOnly) return 'text'
  if (areaOnly) return 'area'
  return null
}

export function buildActiveEditorProps(type, model) {
  switch (type) {
    case 'point':
      return {
        selectedPoints: model.selectedPoints,
        points: model.points,
        lines: model.lines
      }
    case 'line':
      return {
        selectedLines: model.selectedLines,
        lines: model.lines,
        bsplines: model.bsplines,
        points: model.points
      }
    case 'text':
      return {
        selectedTexts: model.selectedTexts,
        texts: model.texts
      }
    case 'area':
      return {
        selectedAreas: model.selectedAreas,
        areas: model.areas
      }
    default:
      return {}
  }
}

export function hasMultipleSelection({ selectedPoints = [], selectedLines = [], selectedTexts = [], selectedAreas = [] }) {
  const totalSelection = selectedPoints.length + selectedLines.length + selectedTexts.length + (selectedAreas?.length || 0)
  return totalSelection > 1
}