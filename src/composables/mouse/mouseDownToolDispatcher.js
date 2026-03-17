/**
 * 鼠标左键按下后的工具分发器。
 * 将 MouseEventHandler 中的工具分支路由抽离，组件仅保留事件入口。
 *
 * @typedef {Object} MouseDownDispatcherVM
 * @property {string|null} currentTool
 * @property {(x:number, y:number)=>void} addPoint
 * @property {(x:number, y:number)=>void} handleTextTool
 * @property {(x:number, y:number)=>void} handleLineTool
 * @property {(x:number, y:number)=>void} handleCurveTool
 * @property {boolean} wasSelection
 * @property {{x:number,y:number}|null} selectionStart
 * @property {{x:number,y:number}|null} selectionEnd
 */

/**
 * @param {MouseDownDispatcherVM} vm
 */
export function createMouseDownToolDispatcher(vm) {
  /**
   * @param {number} x
   * @param {number} y
   */
  function dispatchLeftToolAction(x, y) {
    const tool = vm.currentTool

    if (tool === 'point' || tool === 'site' || tool === 'rest' || tool === 'charging') {
      vm.addPoint(x, y)
      return
    }

    if (tool === 'text') {
      vm.handleTextTool(x, y)
      return
    }

    if (tool === 'line') {
      vm.handleLineTool(x, y)
      return
    }

    if (tool === 'curve') {
      vm.handleCurveTool(x, y)
      return
    }

    if (tool === null) {
      vm.wasSelection = false
      vm.selectionStart = { x, y }
      vm.selectionEnd = { x, y }
    }
  }

  return {
    dispatchLeftToolAction
  }
}
