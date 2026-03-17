import { describe, it, expect, vi } from 'vitest'
import { createMouseDownToolDispatcher } from '../mouse/mouseDownToolDispatcher.js'

describe('createMouseDownToolDispatcher', () => {
  function makeVm() {
    return {
      currentTool: null,
      addPoint: vi.fn(),
      handleTextTool: vi.fn(),
      handleLineTool: vi.fn(),
      handleCurveTool: vi.fn(),
      wasSelection: false,
      selectionStart: null,
      selectionEnd: null
    }
  }

  it('分发 point/site/rest/charging 工具', () => {
    const vm = makeVm()
    const dispatcher = createMouseDownToolDispatcher(vm)
    for (const tool of ['point', 'site', 'rest', 'charging']) {
      vm.currentTool = tool
      dispatcher.dispatchLeftToolAction(10, 20)
      expect(vm.addPoint).toHaveBeenCalledWith(10, 20)
    }
  })

  it('分发 text 工具', () => {
    const vm = makeVm()
    vm.currentTool = 'text'
    const dispatcher = createMouseDownToolDispatcher(vm)
    dispatcher.dispatchLeftToolAction(5, 6)
    expect(vm.handleTextTool).toHaveBeenCalledWith(5, 6)
  })

  it('分发 line 工具', () => {
    const vm = makeVm()
    vm.currentTool = 'line'
    const dispatcher = createMouseDownToolDispatcher(vm)
    dispatcher.dispatchLeftToolAction(1, 2)
    expect(vm.handleLineTool).toHaveBeenCalledWith(1, 2)
  })

  it('分发 curve 工具', () => {
    const vm = makeVm()
    vm.currentTool = 'curve'
    const dispatcher = createMouseDownToolDispatcher(vm)
    dispatcher.dispatchLeftToolAction(7, 8)
    expect(vm.handleCurveTool).toHaveBeenCalledWith(7, 8)
  })

  it('分发 null 工具（框选起点）', () => {
    const vm = makeVm()
    vm.currentTool = null
    const dispatcher = createMouseDownToolDispatcher(vm)
    dispatcher.dispatchLeftToolAction(3, 4)
    expect(vm.wasSelection).toBe(false)
    expect(vm.selectionStart).toEqual({ x: 3, y: 4 })
    expect(vm.selectionEnd).toEqual({ x: 3, y: 4 })
  })
})
