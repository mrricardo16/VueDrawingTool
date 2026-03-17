export function markGeometryDirty(vm, { invalidateSelectionSets = false, rebuildSpatialGrids = false } = {}) {
  vm.pointByIdCache = null
  vm.baseCacheDirty = true

  if (invalidateSelectionSets) {
    vm._selSetsDirty = true
  }

  if (rebuildSpatialGrids) {
    vm.$refs.mouseEventHandler?.rebuildSpatialGrids()
  }

  vm.scheduleRedraw()
}

export function handleElementsUpdatedMutation(vm) {
  markGeometryDirty(vm, {
    invalidateSelectionSets: true,
    rebuildSpatialGrids: true
  })
}

export function notifyPointsMutatedMutation(vm) {
  markGeometryDirty(vm, {
    invalidateSelectionSets: true,
    rebuildSpatialGrids: true
  })
}

export function handleAnchorBaseRedrawMutation(vm) {
  vm.renderer.invalidateBsplineCache()
  vm.baseCacheDirty = true
  vm.scheduleRedraw()
}

export function handleDragUpdateMutation(vm) {
  markGeometryDirty(vm)
}

export function handleDragStartMutation(vm, payload) {
  vm.isDragging = true
  vm.$emit('drag-start', payload)
}