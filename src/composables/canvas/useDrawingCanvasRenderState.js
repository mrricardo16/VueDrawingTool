function makeCompatSet(arr) {
  const s = new Set(arr)
  s.includes = (v) => s.has(v)
  return s
}

/**
 * DrawingCanvas 渲染状态机（base/pan/overlay）
 * 将重绘路径与缓存管理从组件 methods 中抽离。
 */
export function createDrawingCanvasRenderState(vm) {
  return {
    ensureBaseCache() {
      if (!vm.canvas) return
      if (!vm.baseCacheCanvas) {
        vm.baseCacheCanvas = document.createElement('canvas')
        vm.baseCacheCtx = vm.baseCacheCanvas.getContext('2d')
      }
      if (vm.baseCacheCanvas.width !== vm.canvas.width || vm.baseCacheCanvas.height !== vm.canvas.height) {
        vm.baseCacheCanvas.width = vm.canvas.width
        vm.baseCacheCanvas.height = vm.canvas.height
        vm.baseCacheValid = false
        vm.baseCacheDirty = true
      }
    },

    renderBaseCache() {
      if (!vm.baseCacheCtx) return

      if (vm._selSetsDirty || !vm._selSets) {
        vm._selSets = {
          points: makeCompatSet(vm.selectedPoints),
          lines: makeCompatSet(vm.selectedLines),
          texts: makeCompatSet(vm.selectedTexts),
          areas: makeCompatSet(vm.selectedAreas)
        }
        vm._selSetsDirty = false
      }

      const visiblePoints = vm.layerStore.filterVisibleElements(vm.points)
      const visibleLines = vm.layerStore.filterVisibleElements(vm.lines)
      const visibleBsplines = vm.layerStore.filterVisibleElements(vm.bsplines)
      const visibleTexts = vm.layerStore.filterVisibleElements(vm.texts)
      const visibleAreas = vm.layerStore.filterVisibleElements(vm.areas)

      vm.renderer.setCtx(vm.baseCacheCtx)
      vm.baseCacheCtx.clearRect(0, 0, vm.baseCacheCanvas.width, vm.baseCacheCanvas.height)
      try {
        const visible = vm.getVisibleWorldRect()
        const pb = vm.getPointByIdFn()
        vm.renderer.drawGrid(vm.baseCacheCanvas, vm.scale, vm.offset)
        vm.renderer.drawAreas(visibleAreas, vm._selSets.areas, vm.scale, vm.offset)
        vm.renderer.drawLines(visibleLines, pb, vm._selSets.lines, vm.scale, vm.offset, visible)

        const filteredBsplines = (() => {
          if (!visibleBsplines.length) return []
          if (vm.isDragging) return []
          if (!visible) {
            return visibleBsplines.filter((b) => {
              const sp = pb(b.startPointId ?? b.siteA)
              const ep = pb(b.endPointId ?? b.siteB)
              return !!(sp || ep)
            })
          }
          const pad = 2000
          const x1 = visible.minX - pad
          const x2 = visible.maxX + pad
          const y1 = visible.minY - pad
          const y2 = visible.maxY + pad
          const inView = (p) => p && p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2
          return visibleBsplines.filter((b) => {
            const sp = pb(b.startPointId ?? b.siteA)
            const ep = pb(b.endPointId ?? b.siteB)
            if (!sp && !ep) return false
            return inView(sp) || inView(ep)
          })
        })()

        vm.renderer.drawBsplines(filteredBsplines, pb, vm._selSets.lines, vm.scale, vm.offset)
        vm.renderer.drawPoints(
          visiblePoints,
          vm._selSets.points,
          vm.scale,
          vm.offset,
          {
            curveStartPoint: vm.curveStartPoint,
            curveEndPoint: vm.curveEndPoint,
            curveControlPoints: vm.curveControlPoints
          },
          visible
        )
        vm.renderer.drawTexts(visibleTexts, vm._selSets.texts, vm.scale, vm.offset, visible)
      } finally {
        vm.renderer.setCtx(vm.ctx)
      }

      vm.baseCacheDirty = false
      vm.baseCacheValid = true
    },

    ensurePanCache() {
      if (!vm.canvas) return
      if (!vm.panCacheCanvas) {
        vm.panCacheCanvas = document.createElement('canvas')
        vm.panCacheCtx = vm.panCacheCanvas.getContext('2d')
      }
      if (vm.panCacheCanvas.width !== vm.canvas.width || vm.panCacheCanvas.height !== vm.canvas.height) {
        vm.panCacheCanvas.width = vm.canvas.width
        vm.panCacheCanvas.height = vm.canvas.height
        vm.panCacheValid = false
      }
    },

    beginPanFastMode() {
      if (!vm.ctx || !vm.canvas) return
      this.ensurePanCache()
      this.ensureBaseCache()
      if (vm.baseCacheDirty || !vm.baseCacheValid) this.renderBaseCache()
      vm.panCacheCtx.clearRect(0, 0, vm.panCacheCanvas.width, vm.panCacheCanvas.height)
      vm.panCacheCtx.drawImage(vm.baseCacheCanvas, 0, 0)
      vm.panCacheBaseOffset = { x: vm.offset.x, y: vm.offset.y }
      vm.panCacheValid = true
    },

    endPanFastMode() {
      vm.panCacheValid = false
      vm.panCacheBaseOffset = null
      vm.scheduleRedraw()
    },

    redraw() {
      if (!vm.ctx) return

      if (vm.interaction.panning && vm.panCacheValid && vm.panCacheBaseOffset) {
        const dx = (vm.offset?.x || 0) - vm.panCacheBaseOffset.x
        const dy = (vm.offset?.y || 0) - vm.panCacheBaseOffset.y
        vm.ctx.clearRect(0, 0, vm.canvas.width, vm.canvas.height)
        vm.ctx.fillStyle = '#27314A'
        vm.ctx.fillRect(0, 0, vm.canvas.width, vm.canvas.height)
        vm.ctx.drawImage(vm.panCacheCanvas, dx, dy)
        this.drawOverlays()
        return
      }

      this.ensureBaseCache()
      if (vm.baseCacheDirty || !vm.baseCacheValid) this.renderBaseCache()
      vm.ctx.clearRect(0, 0, vm.canvas.width, vm.canvas.height)
      vm.ctx.drawImage(vm.baseCacheCanvas, 0, 0)
      this.drawOverlays()
    },

    drawOverlays() {
      if (!vm.overlayCtx || !vm.overlayCanvas) return
      vm.overlayCtx.clearRect(0, 0, vm.overlayCanvas.width, vm.overlayCanvas.height)
      vm.renderer.setCtx(vm.overlayCtx)
      vm.renderer.drawSelection({
        currentTool: vm.currentTool,
        selectionStart: vm.selectionStart,
        selectionEnd: vm.selectionEnd
      })
      vm.renderer.drawPreview(
        {
          currentTool: vm.currentTool,
          tempLineStart: vm.tempLineStart,
          mousePosition: vm.mousePosition,
          curveStartPoint: vm.curveStartPoint,
          curveEndPoint: vm.curveEndPoint,
          curveControlPoints: vm.curveControlPoints
        },
        vm.scale,
        vm.offset
      )
      if (vm.ctx) vm.renderer.setCtx(vm.ctx)

      vm.$refs.anchorEditHandler?.drawHandles(vm.overlayCtx)
    }
  }
}
