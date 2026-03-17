// LayeredCanvas.test.js
import { LayeredCanvas } from '../LayeredCanvas.js'

describe('LayeredCanvas', () => {
  it('构造函数初始化属性', () => {
    const mainCanvas = { width: 100, height: 100, getContext: () => ({}) }
    const layered = new LayeredCanvas(mainCanvas)
    expect(layered.mainCanvas).toBe(mainCanvas)
    expect(layered.mainCtx).toBeDefined()
    expect(layered.layers).toBeDefined()
    expect(layered.stats).toBeDefined()
  })
})
