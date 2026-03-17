import { describe, expect, it } from 'vitest'

import {
  resolveActiveBsplineForEdit,
  resolveActiveBsplineStartPoint,
  resolveActiveBsplineEndPoint,
  resolveActiveAreaForEdit
} from '../canvas/useCanvasActiveEditors.js'

describe('useCanvasActiveEditors', () => {
  it('resolves active bspline only when exactly one line selected', () => {
    const bsplines = [{ id: 'b1' }, { id: 'b2' }]

    expect(resolveActiveBsplineForEdit({ selectedLines: [], bsplines })).toBeNull()
    expect(resolveActiveBsplineForEdit({ selectedLines: ['b1', 'b2'], bsplines })).toBeNull()
    expect(resolveActiveBsplineForEdit({ selectedLines: ['b2'], bsplines })).toEqual({ id: 'b2' })
  })

  it('resolves bspline start/end points with fallback fields', () => {
    const points = [{ id: 1, x: 10, y: 20 }, { id: 2, x: 30, y: 40 }]

    const byStartEndId = { startPointId: 1, endPointId: 2 }
    expect(resolveActiveBsplineStartPoint({ activeBsplineForEdit: byStartEndId, points })).toEqual(points[0])
    expect(resolveActiveBsplineEndPoint({ activeBsplineForEdit: byStartEndId, points })).toEqual(points[1])

    const bySite = { siteA: 2, siteB: 1 }
    expect(resolveActiveBsplineStartPoint({ activeBsplineForEdit: bySite, points })).toEqual(points[1])
    expect(resolveActiveBsplineEndPoint({ activeBsplineForEdit: bySite, points })).toEqual(points[0])
  })

  it('resolves active area only when single area selected', () => {
    const areas = [{ id: 'a1' }, { id: 'a2' }]

    expect(resolveActiveAreaForEdit({ selectedAreas: [], areas })).toBeNull()
    expect(resolveActiveAreaForEdit({ selectedAreas: ['a1', 'a2'], areas })).toBeNull()
    expect(resolveActiveAreaForEdit({ selectedAreas: ['a1'], areas })).toEqual({ id: 'a1' })
  })
})
