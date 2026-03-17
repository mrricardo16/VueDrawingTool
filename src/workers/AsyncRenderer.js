/**
 * 异步渲染器
 * 使用OffscreenCanvas在Worker中处理坐标转换和虚拟化
 * 避免主线程阻塞
 */

class AsyncRenderer {
  constructor() {
    this.spatialGrid = null
    this.coordinateCache = new Map()
    this.visibleElements = []
    this.isProcessing = false
  }
  
  /**
   * 初始化空间网格
   */
  initSpatialGrid(bounds, cellSize) {
    this.spatialGrid = {
      bounds,
      cellSize,
      grid: new Map(),
      elements: new Set()
    }
  }
  
  /**
   * 批量添加元素到空间网格
   */
  addElementsToGrid(elements) {
    if (!this.spatialGrid) return
    
    elements.forEach(element => {
      if (this.spatialGrid.elements.has(element)) return
      
      this.spatialGrid.elements.add(element)
      
      const keys = this.getCellKeys(element.x, element.y)
      keys.forEach(key => {
        if (!this.spatialGrid.grid.has(key)) {
          this.spatialGrid.grid.set(key, new Set())
        }
        this.spatialGrid.grid.get(key).add(element)
      })
    })
  }
  
  /**
   * 获取网格键
   */
  getCellKeys(x, y) {
    const keys = []
    const { bounds, cellSize } = this.spatialGrid
    const cellX = Math.floor((x - bounds.minX) / cellSize)
    const cellY = Math.floor((y - bounds.minY) / cellSize)
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`
        keys.push(key)
      }
    }
    
    return keys
  }
  
  /**
   * 查询可见元素
   */
  queryVisibleElements(viewBounds) {
    if (!this.spatialGrid) return []
    
    const visibleElements = new Set()
    const { bounds, cellSize, grid } = this.spatialGrid
    
    const startCellX = Math.floor((viewBounds.minX - bounds.minX) / cellSize)
    const endCellX = Math.floor((viewBounds.maxX - bounds.minX) / cellSize)
    const startCellY = Math.floor((viewBounds.minY - bounds.minY) / cellSize)
    const endCellY = Math.floor((viewBounds.maxY - bounds.minY) / cellSize)
    
    for (let x = startCellX; x <= endCellX; x++) {
      for (let y = startCellY; y <= endCellY; y++) {
        const key = `${x},${y}`
        const cell = grid.get(key)
        if (cell) {
          cell.forEach(element => visibleElements.add(element))
        }
      }
    }
    
    return Array.from(visibleElements)
  }
  
  /**
   * 批量坐标转换
   */
  transformCoordinates(elements, scale, offset) {
    const results = []
    
    elements.forEach(element => {
      const screenX = element.x * scale + offset.x
      const screenY = -element.y * scale + offset.y // Y轴翻转
      
      results.push({
        id: element.id,
        screenX,
        screenY,
        element
      })
    })
    
    return results
  }
  
  /**
   * 处理渲染请求
   */
  async processRenderRequest(elements, scale, offset, viewBounds) {
    if (this.isProcessing) return null
    
    this.isProcessing = true
    
    try {
      // 1. 查询可见元素
      const visibleElements = this.queryVisibleElements(viewBounds)
      
      // 2. 批量坐标转换
      const transformedElements = this.transformCoordinates(visibleElements, scale, offset)
      
      // 3. 更新坐标缓存
      transformedElements.forEach(({ id, screenX, screenY }) => {
        this.coordinateCache.set(id, {
          screenX,
          screenY,
          scale,
          offset,
          timestamp: Date.now()
        })
      })
      
      this.visibleElements = transformedElements
      
      return {
        visibleElements: transformedElements,
        totalCount: elements.length,
        visibleCount: visibleElements.length,
        processingTime: Date.now()
      }
      
    } finally {
      this.isProcessing = false
    }
  }
  
  /**
   * 增量更新元素
   */
  async updateElements(updatedElements, scale, offset) {
    const transformedUpdates = this.transformCoordinates(updatedElements, scale, offset)
    
    transformedUpdates.forEach(({ id, screenX, screenY }) => {
      this.coordinateCache.set(id, {
        screenX,
        screenY,
        scale,
        offset,
        timestamp: Date.now()
      })
    })
    
    return {
      updatedCount: transformedUpdates.length,
      elements: transformedUpdates
    }
  }
  
  /**
   * 获取渲染统计
   */
  getStats() {
    return {
      isProcessing: this.isProcessing,
      visibleElementsCount: this.visibleElements.length,
      cacheSize: this.coordinateCache.size,
      spatialGridStats: this.spatialGrid ? {
        totalElements: this.spatialGrid.elements.size,
        totalCells: this.spatialGrid.grid.size
      } : null
    }
  }
}

// Worker消息处理
const asyncRenderer = new AsyncRenderer()

self.onmessage = function(e) {
  const { type, data } = e.data
  
  switch (type) {
    case 'init':
      asyncRenderer.initSpatialGrid(data.bounds, data.cellSize)
      asyncRenderer.addElementsToGrid(data.elements)
      self.postMessage({ type: 'init-complete' })
      break
      
    case 'render':
      asyncRenderer.processRenderRequest(
        data.elements, 
        data.scale, 
        data.offset, 
        data.viewBounds
      ).then(result => {
        self.postMessage({ type: 'render-complete', data: result })
      })
      break
      
    case 'update':
      asyncRenderer.updateElements(data.elements, data.scale, data.offset).then(result => {
        self.postMessage({ type: 'update-complete', data: result })
      })
      break
      
    case 'get-stats':
      self.postMessage({ 
        type: 'stats', 
        data: asyncRenderer.getStats() 
      })
      break
      
    default:
      console.warn('Unknown message type:', type)
  }
}
