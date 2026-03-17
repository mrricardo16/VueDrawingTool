import { describe, expect, it, vi } from 'vitest'

import {
  computeMapBounds,
  updateScaleLimits,
  fitCanvasToPoints,
  resizeCanvasToContainer
} from '../canvas/useCanvasViewState.js'

describe('useCanvasViewState', () => {
  it('computeMapBounds returns min/max bounds', () => {
    const points = [
      { x: 10, y: -20 },
      { x: -5, y: 8 },
      { x: 20, y: 100 }
    ]

    expect(computeMapBounds(points)).toEqual({ minX: -5, minY: -20, maxX: 20, maxY: 100 })
    expect(computeMapBounds([])).toBeNull()
  })

  it('updateScaleLimits updates vm limits based on fitScale', () => {
    const vm = { minScale: 0, maxScale: 0 }
    updateScaleLimits(vm, 2)

    expect(vm.minScale).toBeCloseTo(0.4)
    expect(vm.maxScale).toBe(100)
  })

  it('fitCanvasToPoints updates scale/offset and redraw', () => {
    const vm = {
      canvas: { width: 1000, height: 500 },
      points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      scale: 1,
      offset: { x: 0, y: 0 },
      minScale: 0,
      maxScale: 0,
      redraw: vi.fn()
    }

    fitCanvasToPoints(vm)

    expect(vm.scale).toBeGreaterThan(0)
    expect(vm.offset.x).toBeTypeOf('number')
    expect(vm.offset.y).toBeTypeOf('number')
    expect(vm.redraw).toHaveBeenCalledTimes(1)
  })

  it('resizeCanvasToContainer applies size, refreshes caches and redraws', () => {
    const vm = {
      canvas: {
        width: 0,
        height: 0,
        parentElement: { clientWidth: 320, clientHeight: 180 }
      },
      overlayCanvas: { width: 0, height: 0 },
      $el: { clientWidth: 0, clientHeight: 0 },
      points: [],
      ensurePanCache: vi.fn(),
      ensureBaseCache: vi.fn(),
      renderer: { invalidateGridPattern: vi.fn() },
      scale: 1,
      offset: { x: 0, y: 0 },
      redraw: vi.fn()
    }

    resizeCanvasToContainer(vm)

    expect(vm.canvas.width).toBe(320)
    expect(vm.canvas.height).toBe(180)
    expect(vm.overlayCanvas.width).toBe(320)
    expect(vm.overlayCanvas.height).toBe(180)
    expect(vm.ensurePanCache).toHaveBeenCalledTimes(1)
    expect(vm.ensureBaseCache).toHaveBeenCalledTimes(1)
    expect(vm.renderer.invalidateGridPattern).toHaveBeenCalledTimes(1)
    expect(vm.redraw).toHaveBeenCalledTimes(1)
  })
})
