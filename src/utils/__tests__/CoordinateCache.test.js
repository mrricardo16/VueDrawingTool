// CoordinateCache.test.js
import { CoordinateCache } from '../CoordinateCache.js'

describe('CoordinateCache', () => {
  it('set/get/isValid 基本功能', () => {
    const cache = new CoordinateCache()
    cache.set('id1', 10, 20, 1, { x: 0, y: 0 })
    expect(cache.isValid('id1', 1, { x: 0, y: 0 })).toBe(true)
    expect(cache.get('id1', 1, { x: 0, y: 0 }).screenX).toBe(10)
    expect(cache.get('id1', 2, { x: 0, y: 0 })).toBeNull()
  })
})
