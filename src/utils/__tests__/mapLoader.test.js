// mapLoader.test.js
import { MapLoader } from '../mapLoader.js'

describe('MapLoader', () => {
  it('calculateTotalWork 正常统计', () => {
    const loader = new MapLoader()
    const mapData = {
      Sites: { a: {}, b: {} },
      Tracks: { t1: {}, t2: {}, t3: {} },
      Curves: { c1: {} },
      Text: { tx1: {}, tx2: {} },
      Area: { ar1: {} }
    }
    expect(loader.calculateTotalWork(mapData)).toBe(9)
  })

  it('readFileAsync 解析正常', async () => {
    const loader = new MapLoader()
    // 模拟文件对象
    const file = new Blob([JSON.stringify({ Sites: { a: {} } })], { type: 'application/json' })
    const result = await loader.readFileAsync(file)
    expect(result.Sites).toBeDefined()
  })

  it('readFileAsync 解析异常', async () => {
    const loader = new MapLoader()
    const file = new Blob(['{ invalid json }'], { type: 'application/json' })
    await expect(loader.readFileAsync(file)).rejects.toThrow('JSON解析失败')
  })

  it('processTracksChunk 会跳过和 Curves 重复的轨迹', () => {
    const loader = new MapLoader()
    const tracks = [
      { id: 100, siteA: 1, siteB: 2, direction: 1 },
      { id: 101, siteA: 2, siteB: 3, direction: 1 }
    ]

    const lines = loader.processTracksChunk(tracks, new Set([100]))

    expect(lines).toHaveLength(1)
    expect(lines[0].id).toBe(101)
  })

  it('processTracksChunk 在无 trackType 时可识别曲线轨迹并跳过', () => {
    const loader = new MapLoader()
    const tracks = [
      {
        id: '200',
        siteA: 1,
        siteB: 2,
        direction: 1,
        ControlPoints: '[{"x":1,"y":1}]'
      },
      {
        id: '201',
        siteA: 2,
        siteB: 3,
        direction: 1
      }
    ]

    const lines = loader.processTracksChunk(tracks)

    expect(lines).toHaveLength(1)
    expect(lines[0].id).toBe(201)
  })
})
