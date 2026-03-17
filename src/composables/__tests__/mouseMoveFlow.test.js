import { describe, it, expect, vi } from 'vitest'
import { createMouseMoveFlow } from '../mouse/mouseMoveFlow.js'

describe('createMouseMoveFlow', () => {
  function makeVm() {
    return {
      isPanning: false,
      panStart: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
      $emit: vi.fn(),
      currentTool: null,
      selectionStart: null,
      selectionEnd: null,
      wasSelection: false,
      canvas: { width: 100, height: 100 },
      updateSelection: vi.fn(),
      tempLineStart: 1,
      curveStartPoint: 2,
      curveEndPoint: 3,
      curveControlPoints: [4, 5]
    }
  }

  it('handlePanning: 正常平移', () => {
    const vm = makeVm()
    vm.isPanning = true
    vm.panStart = { x: 10, y: 20 }
    vm.offset = { x: 100, y: 200 }
    const flow = createMouseMoveFlow(vm)
    const event = { clientX: 15, clientY: 25 }
    const result = flow.handleMove(event, 0, 0)
    expect(vm.panStart).toEqual({ x: 15, y: 25 })
    expect(vm.$emit).toHaveBeenCalledWith('update-canvas-state', { offset: { x: 105, y: 205 } })
  })

  it('handleSelectionDrag: 框选拖动', () => {
    const vm = makeVm()
    vm.currentTool = null
    vm.selectionStart = { x: 10, y: 10 }
    vm.canvas = { width: 100, height: 100 }
    const flow = createMouseMoveFlow(vm)
    const event = { buttons: 1 }
    flow.handleMove(event, 50, 60)
    expect(vm.selectionEnd).toEqual({ x: 50, y: 60 })
    expect(vm.updateSelection).toHaveBeenCalled()
  })

  it('emitToolPreviewState: 工具预览', () => {
    const vm = makeVm()
    vm.currentTool = 'curve'
    const flow = createMouseMoveFlow(vm)
    flow.handleMove({}, 11, 22)
    expect(vm.$emit).toHaveBeenCalledWith('update-canvas-state', {
      mousePosition: { x: 11, y: 22 },
      tempLineStart: 1,
      curveStartPoint: 2,
      curveEndPoint: 3,
      curveControlPoints: [4, 5]
    })
  })
})
