/**
 * DrawingCanvas 缓存标脏与重绘调度管理器。
 * 目标：统一 watcher 中重复的标脏逻辑，降低组件复杂度。
 */
export function createCanvasCacheDirtyManager(vm) {
  const markDirty = ({
    invalidatePointById = false,
    invalidateSelectionSets = true,
    invalidateBaseValidity = false
  } = {}) => {
    if (invalidatePointById) vm.pointByIdCache = null
    if (invalidateSelectionSets) vm._selSetsDirty = true

    vm.baseCacheDirty = true
    if (invalidateBaseValidity) vm.baseCacheValid = false
  }

  const scheduleIfReady = () => {
    if (!vm.isLoading) vm.scheduleRedraw()
  }

  const touchMouseGrid = (mode) => {
    const mouseHandler = vm.$refs.mouseEventHandler
    if (!mouseHandler) return

    if (mode === 'rebuild') {
      vm.$nextTick(() => vm.$refs.mouseEventHandler?.rebuildSpatialGrids())
      return
    }
    if (mode === 'line-dirty') {
      mouseHandler.lineGridDirty = true
      return
    }
    if (mode === 'bspline-dirty') {
      mouseHandler.bsplineGridDirty = true
    }
  }

  return {
    onLoadingFinished(prev, next) {
      if (prev && !next) {
        markDirty({ invalidateBaseValidity: true })
        vm.scheduleRedraw()
      }
    },

    onCollectionLengthChanged({ invalidatePointById = false } = {}) {
      markDirty({ invalidatePointById })
      scheduleIfReady()
    },

    onCollectionReplaced({
      invalidatePointById = false,
      mouseGridMode = null
    } = {}) {
      markDirty({ invalidatePointById })
      if (!vm.isLoading) {
        vm.scheduleRedraw()
        if (mouseGridMode) touchMouseGrid(mouseGridMode)
      }
    },

    onSelectionChanged() {
      markDirty()
      vm.scheduleRedraw()
    },

    onViewChanged() {
      markDirty({ invalidateSelectionSets: false })
      vm.scheduleRedraw()
    }
  }
}
