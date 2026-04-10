/**
 * App 编辑交互动作（工具切换/对齐/选中同步/拖拽桥接）
 * @param {{
 * mapStore:any,
 * currentTool:any,
 * selectedPoints:any,
 * selectedTexts:any,
 * drawingCanvas:any,
 * alignElements:(alignmentType:string, pointIds:Array<number|string>, textIds:Array<number|string>)=>any,
 * focusOnElement:(type:string, id:number|string)=>void
 * }} deps
 */
export function useEditorActions({
  mapStore,
  currentTool,
  selectedPoints,
  selectedTexts,
  drawingCanvas,
  alignElements,
  focusOnElement
}) {
  /** @param {any} canvasRef */
  const handleCanvasReady = (canvasRef) => {
    drawingCanvas.value = canvasRef
    mapStore.setDrawingCanvas(canvasRef)
    if (typeof mapStore.tryAutoLoadFromServer === 'function') {
      mapStore.tryAutoLoadFromServer()
    }
  }

  /** @param {any} payload */
  const handleDragStart = (payload) => {
    mapStore.handleDragStart(payload)
  }

  const handleMoveCompleted = () => {
    mapStore.handleMoveCompleted()
  }

  /** @param {any} area */
  const handleUpdateArea = (area) => {
    mapStore.handleUpdateArea(area)
  }

  /** @param {{bsplineId:number|string,before:any}} payload */
  const handleBsplineAnchorDragEnd = ({ bsplineId, before }) => {
    mapStore.handleCurveAnchorDragEnd(bsplineId, before)
  }

  /** @param {{areaId:number|string,before:any}} payload */
  const handleAreaAnchorDragEnd = ({ areaId, before }) => {
    mapStore.handleAreaAnchorDragEnd(areaId, before)
  }

  /** @param {string} alignmentType */
  const performAlignment = (alignmentType) => {
    if (import.meta.env.DEV) console.log('App.vue: 执行对齐', alignmentType)
    const result = alignElements(alignmentType, selectedPoints.value, selectedTexts.value)
    if (!result) return
    mapStore.applyAlignmentResult(result)
  }

  /** @param {'point'|'line'|'curve'|'text'|'area'|string} type @param {Array<number|string>} ids */
  const onElementSelection = (type, ids) => {
    mapStore.setSelectedPoints([])
    mapStore.setSelectedLines([])
    mapStore.setSelectedTexts([])
    mapStore.setSelectedAreas([])

    if (type === 'point') mapStore.setSelectedPoints(ids)
    else if (type === 'line' || type === 'curve') mapStore.setSelectedLines(ids)
    else if (type === 'text') mapStore.setSelectedTexts(ids)
    else if (type === 'area') mapStore.setSelectedAreas(ids)

    if (ids?.length) {
      focusOnElement(type, ids[0])
    }
  }

  /** @param {'point'|'line'|'curve'|'text'|'area'|string} type @param {number|string} id */
  const onElementFocus = (type, id) => {
    focusOnElement(type, id)
  }

  /** @param {string|null} tool */
  const handleToolChange = (tool) => {
    if (currentTool.value === tool) mapStore.setTool(null)
    else mapStore.setTool(tool)
  }

  const handleClearMode = () => {
    mapStore.clearMode()
  }

  /** @param {string} mode */
  const handleSelectionModeChange = (mode) => {
    mapStore.setSelectionMode(mode)
  }

  /** @param {boolean} enabled */
  const handleLineReverseToggleChange = (enabled) => {
    mapStore.setLineReverseEnabled(enabled)
  }

  const handleShiftPressed = () => {
    if (drawingCanvas.value) drawingCanvas.value.isShiftPressed = true
  }

  const handleShiftReleased = () => {
    if (drawingCanvas.value) drawingCanvas.value.isShiftPressed = false
  }

  return {
    handleCanvasReady,
    handleDragStart,
    handleMoveCompleted,
    handleUpdateArea,
    handleBsplineAnchorDragEnd,
    handleAreaAnchorDragEnd,
    performAlignment,
    onElementSelection,
    onElementFocus,
    handleToolChange,
    handleClearMode,
    handleSelectionModeChange,
    handleLineReverseToggleChange,
    handleShiftPressed,
    handleShiftReleased
  }
}
