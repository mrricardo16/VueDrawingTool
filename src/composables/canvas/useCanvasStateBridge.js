/**
 * DrawingCanvas 与 MouseEventHandler 之间的状态桥接。
 */
export function applyCanvasStateUpdate(vm, state) {
  let needsBase = false
  let needsOverlay = false

  if (state.interaction && typeof state.interaction.panning === 'boolean') {
    const next = state.interaction.panning
    if (next !== vm.interaction.panning) {
      vm.interaction.panning = next
      next ? vm.beginPanFastMode() : vm.endPanFastMode()
    }
    needsBase = true
  }

  if (state.offset) {
    vm.offset = state.offset
    needsBase = true
  }

  if (state.scale !== undefined) {
    vm.scale = Math.max(vm.minScale, Math.min(vm.maxScale, state.scale))
    needsBase = true
  }

  if (state.selectionStart !== undefined) {
    vm.selectionStart = state.selectionStart
    needsOverlay = true
  }
  if (state.selectionEnd !== undefined) {
    vm.selectionEnd = state.selectionEnd
    needsOverlay = true
  }
  if (state.mousePosition) {
    vm.mousePosition = state.mousePosition
    needsOverlay = true
  }
  if (state.tempLineStart !== undefined) {
    vm.tempLineStart = state.tempLineStart
    needsOverlay = true
  }
  if (state.curveStartPoint !== undefined) {
    vm.curveStartPoint = state.curveStartPoint
    needsOverlay = true
  }
  if (state.curveEndPoint !== undefined) {
    vm.curveEndPoint = state.curveEndPoint
    needsOverlay = true
  }
  if (state.curveControlPoints !== undefined) {
    vm.curveControlPoints = state.curveControlPoints
    needsOverlay = true
  }
  if (state.wasSelection !== undefined) {
    vm.wasSelection = state.wasSelection
  }

  if (vm.isLoading) return
  if (needsBase) {
    vm.scheduleRedraw()
  } else if (needsOverlay) {
    vm._drawOverlays()
  }
}
