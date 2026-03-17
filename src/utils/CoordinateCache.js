/**
 * 坐标缓存系统
 * 避免重复计算坐标转换
 * 支持增量更新和批量操作
 */

export class CoordinateCache {
  /**
   * 坐标缓存系统
   */
  constructor() {
    this.cache = new Map() // elementId -> { screenX, screenY, scale, offset }
    this.lastScale = 1
    this.lastOffset = { x: 0, y: 0 }
    this.hitCount = 0
    this.missCount = 0
  }
  
  /**
   * 检查缓存是否有效
   */
  isValid(elementId, scale, offset) {
    const cached = this.cache.get(elementId)
    if (!cached) return false
    
    return cached.scale === scale && 
           cached.offset.x === offset.x && 
           cached.offset.y === offset.y
  }
  
  /**
   * 获取缓存的坐标
   */
  get(elementId, scale, offset) {
    if (this.isValid(elementId, scale, offset)) {
      this.hitCount++
      return this.cache.get(elementId)
    }
    
    this.missCount++
    return null
  }
  
  /**
   * 设置缓存坐标
   */
  set(elementId, screenX, screenY, scale, offset) {
    this.cache.set(elementId, {
      screenX,
      screenY,
      scale,
      offset: { ...offset },
      timestamp: Date.now()
    })
  }
  
  /**
   * 批量设置缓存
   */
  setBatch(elements, scale, offset, coordinateTransformer) {
    elements.forEach(element => {
      const { screenX, screenY } = coordinateTransformer(element.x, element.y, scale, offset)
      this.set(element.id, screenX, screenY, scale, offset)
    })
  }
  
  /**
   * 更新变换参数时清理缓存
   */
  updateTransform(scale, offset) {
    // 如果变换参数变化，清理相关缓存
    if (scale !== this.lastScale || 
        offset.x !== this.lastOffset.x || 
        offset.y !== this.lastOffset.y) {
      
      // 部分清理：只清理受影响的元素
      this.invalidatePartial(scale, offset)
      
      this.lastScale = scale
      this.lastOffset = { ...offset }
    }
  }
  
  /**
   * 部分清理缓存（智能清理）
   */
  invalidatePartial(newScale, newOffset) {
    const scaleChanged = newScale !== this.lastScale
    const offsetChanged = newOffset.x !== this.lastOffset.x || newOffset.y !== this.lastOffset.y
    
    if (scaleChanged) {
      // 缩放变化时清理所有缓存
      this.cache.clear()
    } else if (offsetChanged) {
      // 偏移变化时，可以保留部分缓存
      // 这里简化处理，实际可以更精确
      this.cache.clear()
    }
  }
  
  /**
   * 移除特定元素的缓存
   */
  remove(elementId) {
    this.cache.delete(elementId)
  }
  
  /**
   * 批量移除元素缓存
   */
  removeBatch(elementIds) {
    elementIds.forEach(id => this.cache.delete(id))
  }
  
  /**
   * 获取缓存统计
   */
  getStats() {
    const total = this.hitCount + this.missCount
    return {
      cacheSize: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total * 100).toFixed(2) + '%' : '0%',
      lastScale: this.lastScale,
      lastOffset: this.lastOffset
    }
  }
  
  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear()
    this.hitCount = 0
    this.missCount = 0
  }
}

/**
 * 增量更新管理器
 * 用于处理调度系统的动态更新
 */
export class IncrementalUpdater {
  constructor() {
    this.pendingUpdates = new Set() // 待更新的元素ID
    this.batchSize = 50 // 每批处理的元素数量
    this.updateInterval = 16 // 60fps更新频率
    this.isUpdating = false
  }
  
  /**
   * 添加待更新元素
   */
  scheduleUpdate(elementId) {
    this.pendingUpdates.add(elementId)
  }
  
  /**
   * 批量添加待更新元素
   */
  scheduleBatch(elementIds) {
    elementIds.forEach(id => this.pendingUpdates.add(id))
  }
  
  /**
   * 处理批量更新
   */
  async processBatch(elements, coordinateCache, scale, offset, coordinateTransformer) {
    if (this.isUpdating) return
    
    this.isUpdating = true
    
    const updates = Array.from(this.pendingUpdates).slice(0, this.batchSize)
    const elementsToUpdate = elements.filter(el => updates.includes(el.id))
    
    // 批量更新坐标
    coordinateCache.setBatch(elementsToUpdate, scale, offset, coordinateTransformer)
    
    // 从待更新列表中移除已处理的元素
    updates.forEach(id => this.pendingUpdates.delete(id))
    
    this.isUpdating = false
    
    return {
      updatedCount: elementsToUpdate.length,
      remainingCount: this.pendingUpdates.size
    }
  }
  
  /**
   * 获取更新统计
   */
  getStats() {
    return {
      pendingCount: this.pendingUpdates.size,
      batchSize: this.batchSize,
      isUpdating: this.isUpdating
    }
  }
  
  /**
   * 清空待更新列表
   */
  clear() {
    this.pendingUpdates.clear()
    this.isUpdating = false
  }
}

export default CoordinateCache
