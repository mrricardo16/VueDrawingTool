// PerformanceOptimizerV2.test.js
import { PerformanceOptimizerV2 } from '../PerformanceOptimizerV2.js'

describe('PerformanceOptimizerV2', () => {
  it('构造函数初始化属性', () => {
    const canvas = { getContext: () => ({}) }
    const optimizer = new PerformanceOptimizerV2(canvas)
    expect(optimizer.canvas).toBe(canvas)
    expect(optimizer.ctx).toBeDefined()
    expect(optimizer.coordinateCache).toBeDefined()
    expect(optimizer.layeredCanvas).toBeDefined()
  })
})
