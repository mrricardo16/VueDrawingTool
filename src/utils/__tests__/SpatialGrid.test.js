// SpatialGrid.test.js
import { SpatialGrid } from '../SpatialGrid.js'

describe('SpatialGrid', () => {
  it('insert 和 query 基本功能', () => {
    const grid = new SpatialGrid(10)
    grid.insert('item1', 5, 5)
    grid.insert('item2', 15, 15)
    const out = []
    grid.query(0, 0, 10, 10, out)
    expect(out).toContain('item1')
    expect(out).not.toContain('item2')
  })

  it('insertBBox 能插入多个格', () => {
    const grid = new SpatialGrid(10)
    grid.insertBBox('item', 0, 0, 20, 20)
    const out = []
    grid.query(0, 0, 20, 20, out)
    expect(out).toContain('item')
  })
})
