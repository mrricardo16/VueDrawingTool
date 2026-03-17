export function computeMapBounds(points = []) {
  if (!points.length) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  points.forEach(p => {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  })

  return { minX, minY, maxX, maxY }
}

export function updateScaleLimits(vm, fitScale) {
  const base = Math.max(0.0001, fitScale)
  vm.minScale = Math.max(0.0001, base * 0.2)
  vm.maxScale = Math.max(50, base * 50)
}

export function fitCanvasToPoints(vm) {
  if (!vm.canvas || !vm.points.length) return

  const bounds = computeMapBounds(vm.points)
  if (!bounds) return

  let { minX, minY, maxX, maxY } = bounds
  const padding = 100
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

  const spanX = maxX - minX
  const spanY = maxY - minY
  if (!(spanX > 0) || !(spanY > 0)) {
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const s = vm.scale || 1
    vm.scale = s
    vm.offset.x = vm.canvas.width / 2 - cx * s
    vm.offset.y = vm.canvas.height / 2 + cy * s
    vm.redraw()
    return
  }

  const fitScale = Math.min(vm.canvas.width / spanX, vm.canvas.height / spanY) * 0.95
  updateScaleLimits(vm, fitScale)

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  vm.scale = fitScale
  vm.offset.x = vm.canvas.width / 2 - cx * fitScale
  vm.offset.y = vm.canvas.height / 2 + cy * fitScale
  vm.redraw()
}

export function resizeCanvasToContainer(vm) {
  const container = vm.canvas.parentElement
  const w = container?.clientWidth || vm.$el?.clientWidth || 0
  const h = container?.clientHeight || vm.$el?.clientHeight || 0

  vm.canvas.width = w > 0 ? w : Math.max(1, window.innerWidth)
  vm.canvas.height = h > 0 ? h : Math.max(1, window.innerHeight)

  if (vm.overlayCanvas) {
    vm.overlayCanvas.width = vm.canvas.width
    vm.overlayCanvas.height = vm.canvas.height
  }

  vm.ensurePanCache()
  vm.ensureBaseCache()
  vm.renderer.invalidateGridPattern()
  fitCanvasToPoints(vm)
  vm.redraw()
}