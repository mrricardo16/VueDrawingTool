import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMouseTextEditingManager } from '../mouse/textEditingManager.js'

describe('createMouseTextEditingManager', () => {
  let vm, doc, manager
  beforeEach(() => {
    vm = {
      textInput: null,
      isTextEditing: false,
      currentText: null,
      $emit: vi.fn()
    }
    // mock document
    doc = {
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      createElement: vi.fn(() => ({
        style: {},
        addEventListener: vi.fn(),
        focus: vi.fn(),
        select: vi.fn(),
        parentNode: { removeChild: vi.fn() }
      }))
    }
    manager = createMouseTextEditingManager(vm, doc)
  })

  it('startTextEditing 应设置状态并创建 input', () => {
    const text = { name: 'abc', color: '#fff' }
    manager.startTextEditing(text)
    expect(vm.currentText).toBe(text)
    expect(vm.isTextEditing).toBe(true)
    expect(doc.createElement).toHaveBeenCalledWith('input')
    expect(doc.body.appendChild).toHaveBeenCalled()
    expect(vm.textInput).toBeTruthy()
  })

  it('finishTextEditing 应 emit 并清理 input', () => {
    const text = { name: 'abc', color: '#fff' }
    manager.startTextEditing(text)
    vm.textInput.value = 'newName'
    manager.finishTextEditing()
    expect(vm.$emit).toHaveBeenCalledWith('text-added', expect.objectContaining({ name: 'newName' }))
    expect(vm.textInput).toBe(null)
    expect(vm.isTextEditing).toBe(false)
    expect(vm.currentText).toBe(null)
  })

  it('cancelTextEditing 只清理 input', () => {
    const text = { name: 'abc', color: '#fff' }
    manager.startTextEditing(text)
    manager.cancelTextEditing()
    expect(vm.textInput).toBe(null)
    expect(vm.isTextEditing).toBe(false)
    expect(vm.currentText).toBe(null)
  })

  it('createTextInput 多次调用只保留一个 input', () => {
    const text = { name: 'abc', color: '#fff' }
    manager.createTextInput(text)
    const firstInput = vm.textInput
    manager.createTextInput(text)
    expect(vm.textInput).not.toBe(firstInput)
  })
})
