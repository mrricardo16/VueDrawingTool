/**
 * MapEditorShell 事件转发映射
 * 统一维护子组件 -> 外层事件的 relay 关系
 * @param {(eventName:string, ...args:any[])=>void} emit
 */
export function createMapEditorShellEventRelay(emit) {
  /** @param {string} eventName */
  const relay = (eventName) => (...args) => emit(eventName, ...args)
  /** @param {string} targetEventName */
  const relayAs = (targetEventName) => (...args) => emit(targetEventName, ...args)

  return {
    drawingToolsListeners: {
      'tool-change': relay('tool-change'),
      'selection-mode-change': relay('selection-mode-change'),
      'reverse-toggle-change': relay('reverse-toggle-change'),
      'perform-alignment': relay('perform-alignment'),
      'upload-map': relay('upload-map'),
      'upload-to-server': relay('upload-to-server'),
      'save-local': relay('save-local'),
      'fit-view': relay('fit-view'),
      'reset-view': relay('reset-view'),
      'delete-selected': relay('delete-selected'),
      undo: relay('undo')
    },
    keyboardListeners: {
      undo: relay('undo'),
      'points-deleted': relayAs('delete-selected'),
      'clear-mode': relay('clear-mode'),
      'shift-pressed': relay('shift-pressed'),
      'shift-released': relay('shift-released')
    },
    drawingCanvasListeners: {
      'point-added': relay('point-added'),
      'point-selected': relay('point-selected'),
      'line-selected': relay('line-selected'),
      'selection-changed': relay('selection-changed'),
      'line-created': relay('line-created'),
      'bspline-created': relay('bspline-created'),
      'bspline-anchor-drag-end': relay('bspline-anchor-drag-end'),
      'text-added': relay('text-added'),
      'text-selected': relay('text-selected'),
      'area-created': relay('area-created'),
      'area-anchor-drag-end': relay('area-anchor-drag-end'),
      'area-selected': relay('area-selected'),
      'clear-mode': relay('clear-mode'),
      undo: relay('undo'),
      'show-context-menu': relay('show-context-menu'),
      'drag-start': relay('drag-start'),
      'move-completed': relay('move-completed'),
      'show-toast': relay('show-toast')
    },
    propertyPanelListeners: {
      'update-point': relay('update-point'),
      'update-line': relay('update-line'),
      'update-text': relay('update-text'),
      'update-curve': relay('update-curve'),
      'update-area': relay('update-area')
    },
    relayElementSelection: relay('element-selection'),
    relayElementFocus: relay('element-focus')
  }
}
