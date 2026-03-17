/**
 * MouseEventHandler 鼠标移动流程
 * 拆分平移、框选拖动和工具预览状态同步逻辑。
 *
 * @typedef {Object} MouseMoveFlowVM
 * @property {boolean} isPanning
 * @property {{x:number,y:number}} panStart
 * @property {{x:number,y:number}} offset
 * @property {(event:string, payload:any)=>void} $emit
 * @property {string|null} currentTool
 * @property {{x:number,y:number}|null} selectionStart
 * @property {{x:number,y:number}|null} selectionEnd
 * @property {boolean} wasSelection
 * @property {{width:number,height:number}} canvas
 * @property {()=>void} updateSelection
 * @property {any} tempLineStart
 * @property {any} curveStartPoint
 * @property {any} curveEndPoint
 * @property {Array<any>} curveControlPoints
 */

/**
 * @param {MouseMoveFlowVM} vm
 */
export function createMouseMoveFlow(vm) {
  /**
   * @param {MouseEvent} event
   * @returns {boolean}
   */
  function handlePanning(event) {
    if (!vm.isPanning) return true

    const dx = event.clientX - vm.panStart.x
    const dy = event.clientY - vm.panStart.y
    vm.panStart = { x: event.clientX, y: event.clientY }

    vm.$emit('update-canvas-state', {
      offset: { x: vm.offset.x + dx, y: vm.offset.y + dy }
    })
    return false
  }

  /**
   * @param {MouseEvent|{buttons?:number}} event
   * @param {number} x
   * @param {number} y
   */
  function handleSelectionDrag(event, x, y) {
    if (!(vm.currentTool === null && event.buttons === 1 && vm.selectionStart)) return

    const cx = Math.max(0, Math.min(x, vm.canvas.width))
    const cy = Math.max(0, Math.min(y, vm.canvas.height))
    vm.selectionEnd = { x: cx, y: cy }

    if (Math.abs(cx - vm.selectionStart.x) > 2 || Math.abs(cy - vm.selectionStart.y) > 2) {
      vm.wasSelection = true
    }

    // 鼠标移动已有节流，框选更新直接同步
    vm.updateSelection()
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  function emitToolPreviewState(x, y) {
    if (!(vm.currentTool === 'curve' || vm.currentTool === 'line')) return

    vm.$emit('update-canvas-state', {
      mousePosition: { x, y },
      tempLineStart: vm.tempLineStart,
      curveStartPoint: vm.curveStartPoint,
      curveEndPoint: vm.curveEndPoint,
      curveControlPoints: [...vm.curveControlPoints]
    })
  }

  /**
   * @param {MouseEvent|{buttons?:number, clientX?:number, clientY?:number}} event
   * @param {number} x
   * @param {number} y
   */
  function handleMove(event, x, y) {
    if (!handlePanning(event)) return
    handleSelectionDrag(event, x, y)
    emitToolPreviewState(x, y)
  }

  return {
    handleMove
  }
}
