// virtualizedRenderer.test.js
import { VirtualizedRenderer } from '../virtualizedRenderer.js'

describe('VirtualizedRenderer', () => {
  it('updateViewport 正常更新', () => {
    const canvas = { width: 100, height: 200 }
    const renderer = new VirtualizedRenderer(canvas, {})
    renderer.updateViewport(2, { x: 10, y: 20 })
    expect(renderer.scale).toBe(2)
    expect(renderer.offset.x).toBe(10)
    expect(renderer.viewport.width).toBe(100)
    expect(renderer.viewport.height).toBe(200)
  })

  it('getVisibleBounds 返回合理边界', () => {
    const canvas = { width: 100, height: 200 }
    const renderer = new VirtualizedRenderer(canvas, {})
    renderer.updateViewport(1, { x: 0, y: 0 })
    const bounds = renderer.getVisibleBounds()
    expect(bounds.minX).toBeLessThan(bounds.maxX)
    expect(bounds.minY).toBeLessThan(bounds.maxY)
  })
})
