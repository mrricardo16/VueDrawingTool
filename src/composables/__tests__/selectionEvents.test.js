import { describe, it, expect, vi } from 'vitest'
import { createMouseSelectionEvents } from '../mouse/selectionEvents.js'

describe('createMouseSelectionEvents', () => {
  function makeVm() {
    return {
      $emit: vi.fn()
    }
  }

  it('clearAllSelection 应发射全部清空事件', () => {
    const vm = makeVm()
    const sel = createMouseSelectionEvents(vm)
    sel.clearAllSelection()
    expect(vm.$emit).toHaveBeenCalledWith('point-selected', [])
    expect(vm.$emit).toHaveBeenCalledWith('line-selected', [])
    expect(vm.$emit).toHaveBeenCalledWith('text-selected', [])
    expect(vm.$emit).toHaveBeenCalledWith('area-selected', [])
  })

  it('emitBatchSelection 应发射批量事件', () => {
    const vm = makeVm()
    const sel = createMouseSelectionEvents(vm)
    const selected = {
      points: [1],
      lines: [2],
      texts: [3],
      areas: [4]
    }
    sel.emitBatchSelection(selected)
    expect(vm.$emit).toHaveBeenCalledWith('selection-changed', selected)
    expect(vm.$emit).toHaveBeenCalledWith('point-selected', [1])
    expect(vm.$emit).toHaveBeenCalledWith('line-selected', [2])
    expect(vm.$emit).toHaveBeenCalledWith('text-selected', [3])
    expect(vm.$emit).toHaveBeenCalledWith('area-selected', [4])
  })

  it('selectSingleHit 应按类型发射单选', () => {
    const vm = makeVm()
    const sel = createMouseSelectionEvents(vm)
    sel.selectSingleHit({ type: 'point', target: { id: 11 } })
    expect(vm.$emit).toHaveBeenCalledWith('point-selected', [11])
    sel.selectSingleHit({ type: 'text', target: { id: 22 } })
    expect(vm.$emit).toHaveBeenCalledWith('text-selected', [22])
    sel.selectSingleHit({ type: 'bspline', target: { id: 33 } })
    expect(vm.$emit).toHaveBeenCalledWith('line-selected', [33])
    sel.selectSingleHit({ type: 'line', target: { id: 44 } })
    expect(vm.$emit).toHaveBeenCalledWith('line-selected', [44])
    sel.selectSingleHit({ type: 'area', target: { id: 55 } })
    expect(vm.$emit).toHaveBeenCalledWith('area-selected', [55])
  })

  it('selectSingleHit 传 null 仅执行清空选中', () => {
    const vm = makeVm()
    const sel = createMouseSelectionEvents(vm)
    sel.selectSingleHit(null)
    expect(vm.$emit).toHaveBeenCalledTimes(4)
    expect(vm.$emit).toHaveBeenCalledWith('point-selected', [])
    expect(vm.$emit).toHaveBeenCalledWith('line-selected', [])
    expect(vm.$emit).toHaveBeenCalledWith('text-selected', [])
    expect(vm.$emit).toHaveBeenCalledWith('area-selected', [])
  })
})
