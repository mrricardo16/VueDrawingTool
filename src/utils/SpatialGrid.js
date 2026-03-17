/**
 * SpatialGrid.js
 * 二维空间哈希网格，用于快速邻域查询。
 * 从 MouseEventHandler 中提取，解除其单一职责过重的问题。
 */

export class SpatialGrid {
  /**
   * 二维空间哈希网格
   * @param {number} cellSize - 网格单元大小（世界坐标）
   */
  constructor(cellSize = 50) {
    this.cellSize = cellSize
    this._map = new Map()
  }

  _key(cx, cy) { return `${cx},${cy}` }

  _cellOf(v) { return Math.floor(v / this.cellSize) }

  /** 清空网格 */
  clear() { this._map.clear() }

  /** 插入单点元素 */
  insert(item, x, y) {
    const key = this._key(this._cellOf(x), this._cellOf(y))
    let arr = this._map.get(key)
    if (!arr) { arr = []; this._map.set(key, arr) }
    arr.push(item)
  }

  /** 插入以 AABB 覆盖的所有单元格（线段、多边形等） */
  insertBBox(item, minX, minY, maxX, maxY) {
    const minCx = this._cellOf(minX)
    const maxCx = this._cellOf(maxX)
    const minCy = this._cellOf(minY)
    const maxCy = this._cellOf(maxY)
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this._key(cx, cy)
        let arr = this._map.get(key)
        if (!arr) { arr = []; this._map.set(key, arr) }
        arr.push(item)
      }
    }
  }

  /**
   * 查询与给定 AABB 相交的所有候选元素（含重复）
   * @param {number[]} out - 可选的复用数组，减少 GC
   */
  query(minX, minY, maxX, maxY, out) {
    const results = out || []
    results.length = 0
    const minCx = Math.floor(minX / this.cellSize)
    const maxCx = Math.ceil(maxX / this.cellSize) - 1
    const minCy = Math.floor(minY / this.cellSize)
    const maxCy = Math.ceil(maxY / this.cellSize) - 1
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const arr = this._map.get(this._key(cx, cy))
        if (arr) for (let i = 0; i < arr.length; i++) results.push(arr[i])
      }
    }
    return results
  }

  /** 简单统计信息 */
  getStats() {
    return {
      cellCount: this._map.size,
      cellSize: this.cellSize
    }
  }

  /** 通用添加方法：根据元素类型选择插入方式 */
  add(item) {
    if (!item) return
    if (item.x !== undefined && item.y !== undefined) {
      this.insert(item, item.x, item.y)
      return
    }
    if (item.bounds) {
      const b = item.bounds
      this.insertBBox(item, b.minX, b.minY, b.maxX, b.maxY)
      return
    }
    if (item.minX !== undefined && item.minY !== undefined && item.maxX !== undefined && item.maxY !== undefined) {
      this.insertBBox(item, item.minX, item.minY, item.maxX, item.maxY)
      return
    }
    if (Array.isArray(item.points) && item.points.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of item.points) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
      }
      this.insertBBox(item, minX, minY, maxX, maxY)
      return
    }
    this.insert(item, 0, 0)
  }

  // ─── 便捷静态构建方法 ───────────────────────────────────────────────

  /** 为点数组构建网格 */
  static fromPoints(points, cellSize) {
    const grid = new SpatialGrid(cellSize)
    for (const p of points) grid.insert(p, p.x, p.y)
    return grid
  }

  /** 为文本数组构建网格 */
  static fromTexts(texts, cellSize) {
    const grid = new SpatialGrid(cellSize)
    for (const t of texts) grid.insert(t, t.x, t.y)
    return grid
  }

  /**
   * 为直线数组构建网格（需要 pointById 查找端点）
   * @param {Map} pointById
   */
  static fromLines(lines, pointById, cellSize) {
    const grid = new SpatialGrid(cellSize)
    for (const line of lines) {
      const sp = pointById.get(line.startPointId)
      const ep = pointById.get(line.endPointId)
      if (!sp || !ep) continue
      grid.insertBBox(
        line,
        Math.min(sp.x, ep.x), Math.min(sp.y, ep.y),
        Math.max(sp.x, ep.x), Math.max(sp.y, ep.y)
      )
    }
    return grid
  }

  /**
   * 为 B 样条数组构建网格（AABB 近似）
   * @param {Map} pointById
   */
  static fromBsplines(bsplines, pointById, cellSize) {
    const grid = new SpatialGrid(cellSize)
    for (const bspline of bsplines) {
      const sp = pointById.get(bspline.startPointId)
      const ep = pointById.get(bspline.endPointId)
      if (!sp || !ep) continue

      let minX = Math.min(sp.x, ep.x), maxX = Math.max(sp.x, ep.x)
      let minY = Math.min(sp.y, ep.y), maxY = Math.max(sp.y, ep.y)

      const ctrlPts = bspline.controlPoints?.length
        ? bspline.controlPoints
        : (bspline.controlPointIds || []).map(id => pointById.get(id)).filter(Boolean)

      for (const p of ctrlPts) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      }

      grid.insertBBox(bspline, minX, minY, maxX, maxY)
    }
    return grid
  }

  /**
   * 为区域数组构建网格（使用包围盒）
   * 新增功能：不影响现有逻辑，提供加速选项
   */
  static fromAreas(areas, cellSize) {
    const grid = new SpatialGrid(cellSize)
    for (const area of areas) {
      if (!area.points || area.points.length === 0) continue
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of area.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
      
      grid.insertBBox(area, minX, minY, maxX, maxY)
    }
    return grid
  }
}
