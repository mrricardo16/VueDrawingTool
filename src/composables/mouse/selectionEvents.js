/**
 * MouseEventHandler 选中事件管理器
 * 负责统一发射清空选中、批量选中和单击命中选中事件。
 *
 * @typedef {import('../../models/types').SelectionIds} SelectionIds
 * @typedef {import('../../models/types').HitResult} HitResult
 * @typedef {Object} SelectionEventsVM
 * @property {(event:string, payload:any)=>void} $emit
 */

/**
 * @param {SelectionEventsVM} vm
 */
export function createMouseSelectionEvents(vm) {
  function clearAllSelection() {
    vm.$emit('point-selected', [])
    vm.$emit('line-selected', [])
    vm.$emit('text-selected', [])
    vm.$emit('area-selected', [])
  }

  /**
   * @param {SelectionIds} selected
   */
  function emitBatchSelection(selected) {
    vm.$emit('selection-changed', {
      points: selected.points,
      lines: selected.lines,
      texts: selected.texts,
      areas: selected.areas
    })

    // 保持原有事件，兼容现有链路
    vm.$emit('point-selected', selected.points)
    vm.$emit('line-selected', selected.lines)
    vm.$emit('text-selected', selected.texts)
    vm.$emit('area-selected', selected.areas)
  }

  /**
   * @param {HitResult|null} hit
   */
  function selectSingleHit(hit) {
    clearAllSelection()
    if (!hit) return

    if (hit.type === 'point') {
      vm.$emit('point-selected', [hit.target.id])
      return
    }
    if (hit.type === 'text') {
      vm.$emit('text-selected', [hit.target.id])
      return
    }
    if (hit.type === 'bspline' || hit.type === 'line') {
      vm.$emit('line-selected', [hit.target.id])
      return
    }
    if (hit.type === 'area') {
      vm.$emit('area-selected', [hit.target.id])
    }
  }

  return {
    clearAllSelection,
    emitBatchSelection,
    selectSingleHit
  }
}
