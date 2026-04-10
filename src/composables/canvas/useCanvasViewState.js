export function computeMapBounds(points = []) {
  if (!points || !points.length) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  points.forEach(p => {
    if (p == null) return
    const x = Number(p.x)
    const y = Number(p.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  })

  if (minX === Infinity) return null
  return { minX, minY, maxX, maxY }
}

export function computeAllBounds({ points = [], lines = [], bsplines = [], texts = [], areas = [] } = {}) {
  // build quick lookup for points by id
  const pointById = new Map()
  for (const p of points) {
    if (p && p.id != null) pointById.set(String(p.id), p)
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  const include = (x, y) => {
    const nx = Number(x), ny = Number(y)
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return
    minX = Math.min(minX, nx)
    minY = Math.min(minY, ny)
    maxX = Math.max(maxX, nx)
    maxY = Math.max(maxY, ny)
  }

  // points
  for (const p of points) if (p) include(p.x, p.y)

  // lines: include endpoints via point lookup
  for (const l of lines) {
    if (!l) continue
    const a = pointById.get(String(l.startPointId))
    const b = pointById.get(String(l.endPointId))
    if (a) include(a.x, a.y)
    if (b) include(b.x, b.y)
  }

  // bspline control points
  for (const b of bsplines) {
    if (!b || !b.controlPoints) continue
    for (const cp of b.controlPoints) include(cp.x, cp.y)
  }

  // texts
  for (const t of texts) if (t) include(t.x, t.y)

  // areas: include polygon points
  for (const a of areas) {
    if (!a || !a.points) continue
    for (const pt of a.points) include(pt.x, pt.y)
  }

  if (minX === Infinity) return null
  return { minX, minY, maxX, maxY }
}

export function updateScaleLimits(vm, fitScale) {
  const base = Math.max(0.0001, fitScale)
  vm.minScale = Math.max(0.0001, base * 0.2)
  vm.maxScale = Math.max(50, base * 50)
}

export function fitCanvasToPoints(vm) {
  if (!vm.canvas) return

  const bounds = computeAllBounds({ points: vm.points || [], lines: vm.lines || [], bsplines: vm.bsplines || [], texts: vm.texts || [], areas: vm.areas || [] }) || computeMapBounds(vm.points)
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