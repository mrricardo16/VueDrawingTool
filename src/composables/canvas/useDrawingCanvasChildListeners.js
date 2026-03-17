/**
 * DrawingCanvas 子组件事件转发映射
 * 将模板中的大量内联 $emit / 状态桥接收敛到单一配置。
 */
export function createDrawingCanvasChildListeners({
  emit,
  handleCanvasStateUpdate,
  handleElementsUpdated,
  handleDragStart,
  handleDragUpdate,
  redraw,
  handleBsplineAnchorDragEnd,
  handleAreaAnchorDragEnd,
  handleAnchorBaseRedraw,
  drawOverlays,
  onDragEnd
}) {
  const relay = (eventName) => (...args) => emit(eventName, ...args)

  return {
    anchorEditListeners: {
      'bspline-anchor-drag-end': handleBsplineAnchorDragEnd,
      'area-anchor-drag-end': handleAreaAnchorDragEnd,
      'request-redraw': drawOverlays,
      'request-base-redraw': handleAnchorBaseRedraw
    },
    mouseEventListeners: {
      'point-added': relay('point-added'),
      'point-selected': relay('point-selected'),
      'line-selected': relay('line-selected'),
      'selection-changed': relay('selection-changed'),
      'line-created': relay('line-created'),
      'bspline-created': relay('bspline-created'),
      'points-deleted': relay('points-deleted'),
      'clear-mode': relay('clear-mode'),
      undo: relay('undo'),
      'text-added': relay('text-added'),
      'text-selected': relay('text-selected'),
      'area-selected': relay('area-selected'),
      'update-canvas-state': handleCanvasStateUpdate,
      'show-context-menu': relay('show-context-menu'),
      'show-toast': relay('show-toast')
    },
    moveModeListeners: {
      'elements-updated': handleElementsUpdated,
      'drag-start': handleDragStart,
      'drag-end': onDragEnd,
      'drag-update': handleDragUpdate,
      'move-completed': relay('move-completed')
    },
    areaHandlerListeners: {
      'area-created': relay('area-created'),
      'redraw-canvas': redraw
    }
  }
}
