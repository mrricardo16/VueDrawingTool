import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useAlignment } from '../useAlignment.js'

describe('useAlignment', () => {
  it('aligns selected points horizontally', () => {
    const points = ref([
      { id: 1, x: 10, y: 20 },
      { id: 2, x: 40, y: 90 },
      { id: 3, x: 60, y: 120 }
    ])
    const texts = ref([])

    const { performAlignment } = useAlignment(points, texts)
    const result = performAlignment('horizontal', [1, 2, 3], [])

    expect(result).not.toBeNull()
    expect(result.alignedPoints).toHaveLength(3)
    expect(result.alignedPoints.map(item => item.y)).toEqual([20, 20, 20])
  })

  it('matches ids robustly when selected ids are strings', () => {
    const points = ref([
      { id: 101, x: 10, y: 20 },
      { id: 202, x: 80, y: 60 }
    ])
    const texts = ref([])

    const { performAlignment } = useAlignment(points, texts)
    const result = performAlignment('vertical', ['101', '202'], [])

    expect(result).not.toBeNull()
    expect(result.alignedPoints.map(item => item.x)).toEqual([10, 10])
  })
})