import { describe, expect, it, vi } from 'vitest'

import {
  markGeometryDirty,
  handleElementsUpdatedMutation,
  notifyPointsMutatedMutation,
  handleAnchorBaseRedrawMutation,
  handleDragUpdateMutation,
  handleDragStartMutation
} from '../canvas/useCanvasMutationOps.js'

describe('useCanvasMutationOps', () => {
  function makeVm() {
    return {
      pointByIdCache: new Map([[1, { id: 1 }]]),
      baseCacheDirty: false,
      _selSetsDirty: false,
      scheduleRedraw: vi.fn(),
      $refs: {
        mouseEventHandler: {
          rebuildSpatialGrids: vi.fn()
        }
      },
      renderer: {
        invalidateBsplineCache: vi.fn()
      },
      isDragging: false,
      $emit: vi.fn()
    }
  }

  it('markGeometryDirty marks dirty and optionally rebuilds', () => {
    const vm = makeVm()
    markGeometryDirty(vm, { invalidateSelectionSets: true, rebuildSpatialGrids: true })

    expect(vm.pointByIdCache).toBeNull()
    expect(vm.baseCacheDirty).toBe(true)
    expect(vm._selSetsDirty).toBe(true)
    expect(vm.$refs.mouseEventHandler.rebuildSpatialGrids).toHaveBeenCalledTimes(1)
    expect(vm.scheduleRedraw).toHaveBeenCalledTimes(1)
  })

  it('delegated mutation handlers keep expected behavior', () => {
    const vm = makeVm()

    handleElementsUpdatedMutation(vm)
    notifyPointsMutatedMutation(vm)
    expect(vm.$refs.mouseEventHandler.rebuildSpatialGrids).toHaveBeenCalledTimes(2)

    handleDragUpdateMutation(vm)
    expect(vm.scheduleRedraw).toHaveBeenCalledTimes(3)

    handleAnchorBaseRedrawMutation(vm)
    expect(vm.renderer.invalidateBsplineCache).toHaveBeenCalledTimes(1)
    expect(vm.baseCacheDirty).toBe(true)

    handleDragStartMutation(vm, { source: 'move' })
    expect(vm.isDragging).toBe(true)
    expect(vm.$emit).toHaveBeenCalledWith('drag-start', { source: 'move' })
  })
})
