/**
 * 性能优化器V2
 * 集成四层优化架构
 * 专门针对5k+元素的调度系统地图
 */

import { SpatialGrid } from './SpatialGrid.js'
import CoordinateCache, { IncrementalUpdater } from './CoordinateCache.js'
import LayeredCanvas, { RenderScheduler } from './LayeredCanvas.js'

export class PerformanceOptimizerV2 {
  /**
   * 性能优化器V2
   * @param {HTMLCanvasElement} canvas - 主画布
   */
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    // 第一层：空间虚拟化
    this.spatialGrid = null

    // 第二层：坐标缓存
    this.coordinateCache = new CoordinateCache()
    this.incrementalUpdater = new IncrementalUpdater()

    // 第三层：异步渲染器
    this.asyncRenderer = null
    this.worker = null

    // 第四层：分层渲染
    this.layeredCanvas = new LayeredCanvas(canvas)
    this.renderScheduler = new RenderScheduler(this.layeredCanvas)

    // 性能监控
    this.stats = {
      renderTime: 0,
      visibleElements: 0,
      totalElements: 0,
      fps: 0,
      lastFrameTime: 0
    }

    this.init()
  }
  
  /**
   * 初始化优化系统
   */
  async init() {
    // 初始化Worker
    await this.initWorker()
    
    // 初始化空间网格
    this.initSpatialGrid()
  }
  
  /**
   * 初始化Web Worker
   */
  async initWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker('./workers/AsyncRenderer.js')
        
        this.worker.onmessage = (e) => {
          this.handleWorkerMessage(e.data)
        }
        
        this.asyncRenderer = {
          postMessage: (data) => this.worker.postMessage(data),
          terminate: () => this.worker.terminate()
        }
        
        if (import.meta.env.DEV) console.log('✅ AsyncRenderer Worker initialized')
      } catch (error) {
        console.warn('⚠️ Worker initialization failed:', error)
        this.asyncRenderer = null
      }
    }
  }
  
  /**
   * 初始化空间网格
   */
  initSpatialGrid() {
    // 根据地图数据计算边界
    this.calculateMapBounds() // 保留边界计算，便于后续扩展
    this.spatialGrid = new SpatialGrid(200) // 200px网格单元
    
    if (import.meta.env.DEV) console.log('✅ SpatialGrid initialized:', this.spatialGrid.getStats())
  }
  
  /**
   * 计算地图边界
   */
  calculateMapBounds() {
    // 这里应该从实际数据计算，暂时使用默认值
    return {
      minX: -10000,
      minY: -10000,
      maxX: 10000,
      maxY: 10000
    }
  }
  
  /**
   * 更新地图数据
   */
  updateMapData(points, lines, bsplines, texts, areas) {
    const allElements = [...points, ...lines, ...bsplines, ...texts, ...areas]
    
    // 更新空间网格
    if (this.spatialGrid) {
      this.spatialGrid.clear()
      allElements.forEach(element => {
        this.spatialGrid.add(element)
      })
    }
    
    // 更新Worker数据
    if (this.asyncRenderer) {
      this.asyncRenderer.postMessage({
        type: 'init',
        data: {
          bounds: this.calculateMapBounds(),
          cellSize: 200,
          elements: allElements
        }
      })
    }
    
    this.stats.totalElements = allElements.length
  }
  
  /**
   * 智能重绘
   */
  async smartRedraw(scale, offset, elements) {
    const startTime = performance.now()
    
    try {
      // 1. 更新坐标缓存
      this.coordinateCache.updateTransform(scale, offset)
      
      // 2. 计算可见区域
      const viewBounds = this.calculateViewBounds(scale, offset)
      
      // 3. 查询可见元素
      let visibleElements
      if (this.asyncRenderer) {
        // 使用Worker异步处理
        const result = await this.queryVisibleElementsAsync(elements, scale, offset, viewBounds)
        visibleElements = result.visibleElements
      } else {
        // 同步处理
        visibleElements = this.queryVisibleElementsSync(elements, viewBounds)
      }
      
      // 4. 分层渲染
      this.renderLayers(visibleElements, scale, offset)
      
      // 5. 更新统计
      this.updateStats(startTime, visibleElements.length)
      
    } catch (error) {
      console.error('Smart redraw error:', error)
      // 降级到简单重绘
      this.fallbackRedraw(elements, scale, offset)
    }
  }
  
  /**
   * 计算可见区域
   */
  calculateViewBounds(scale, offset) {
    const width = this.canvas.width
    const height = this.canvas.height
    
    // 转换为世界坐标
    const minX = (-offset.x) / scale
    const maxX = (width - offset.x) / scale
    const minY = -(height - offset.y) / scale // Y轴翻转
    const maxY = -offset.y / scale
    
    return { minX, minY, maxX, maxY }
  }
  
  /**
   * 异步查询可见元素
   */
  async queryVisibleElementsAsync(elements, scale, offset, viewBounds) {
    return new Promise((resolve) => {
      const messageId = Date.now()
      
      const handleMessage = (e) => {
        if (e.data.type === 'render-complete') {
          this.worker.removeEventListener('message', handleMessage)
          resolve(e.data.data)
        }
      }
      
      this.worker.addEventListener('message', handleMessage)
      
      this.asyncRenderer.postMessage({
        type: 'render',
        data: {
          elements,
          scale,
          offset,
          viewBounds
        }
      })
    })
  }
  
  /**
   * 同步查询可见元素
   */
  queryVisibleElementsSync(elements, viewBounds) {
    if (this.spatialGrid) {
      return this.spatialGrid.queryVisible(viewBounds)
    } else {
      // 降级到简单的边界检查
      return elements.filter(element => {
        return element.x >= viewBounds.minX && element.x <= viewBounds.maxX &&
               element.y >= viewBounds.minY && element.y <= viewBounds.maxY
      })
    }
  }
  
  /**
   * 分层渲染
   */
  renderLayers(visibleElements, scale, offset) {
    // 准备渲染器
    const renderers = {
      background: (ctx) => this.renderBackground(ctx, scale, offset),
      data: (ctx) => this.renderData(ctx, visibleElements, scale, offset),
      ui: (ctx) => this.renderUI(ctx, scale, offset)
    }
    
    // 智能渲染
    this.layeredCanvas.smartRender(renderers)
  }
  
  /**
   * 渲染背景层
   */
  renderBackground(ctx, scale, offset) {
    // 渲染网格
    this.renderGrid(ctx, scale, offset)
  }
  
  /**
   * 渲染数据层
   */
  renderData(ctx, visibleElements, scale, offset) {
    visibleElements.forEach(element => {
      this.renderElement(ctx, element, scale, offset)
    })
  }
  
  /**
   * 渲染UI层
   */
  renderUI(ctx, scale, offset) {
    // 渲染选择框、预览等
  }
  
  /**
   * 渲染网格
   */
  renderGrid(ctx, scale, offset) {
    const gridSize = 50 * scale
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 0.5
    
    // 垂直线
    for (let x = offset.x % gridSize; x < ctx.canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ctx.canvas.height)
      ctx.stroke()
    }
    
    // 水平线
    for (let y = offset.y % gridSize; y < ctx.canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(ctx.canvas.width, y)
      ctx.stroke()
    }
  }
  
  /**
   * 渲染元素
   */
  renderElement(ctx, element, scale, offset) {
    // 检查坐标缓存
    let coords = this.coordinateCache.get(element.id, scale, offset)
    
    if (!coords) {
      coords = {
        screenX: element.x * scale + offset.x,
        screenY: -element.y * scale + offset.y
      }
      this.coordinateCache.set(element.id, coords.screenX, coords.screenY, scale, offset)
    }
    
    // 根据元素类型渲染
    switch (element.type) {
      case 'point':
        this.renderPoint(ctx, coords.screenX, coords.screenY, element)
        break
      case 'line':
        this.renderLine(ctx, element, scale, offset)
        break
      case 'bspline':
        this.renderBSpline(ctx, element, scale, offset)
        break
      case 'text':
        this.renderText(ctx, coords.screenX, coords.screenY, element)
        break
    }
  }
  
  /**
   * 渲染点
   */
  renderPoint(ctx, x, y, point) {
    ctx.fillStyle = point.color || '#B8C5D6'
    ctx.beginPath()
    ctx.arc(x, y, point.radius || 4, 0, Math.PI * 2)
    ctx.fill()
  }
  
  /**
   * 渲染线
   */
  renderLine(ctx, line, scale, offset) {
    // 简化实现，实际应该使用完整的线渲染逻辑
    ctx.strokeStyle = line.color || '#B8C5D6'
    ctx.lineWidth = line.width || 1
    ctx.beginPath()
    ctx.moveTo(line.startX * scale + offset.x, -line.startY * scale + offset.y)
    ctx.lineTo(line.endX * scale + offset.x, -line.endY * scale + offset.y)
    ctx.stroke()
  }
  
  /**
   * 渲染B样条
   */
  renderBSpline(ctx, bspline, scale, offset) {
    // 简化实现
    ctx.strokeStyle = bspline.color || '#B8C5D6'
    ctx.lineWidth = bspline.width || 1
    ctx.beginPath()
    // 实际应该计算B样条曲线
    ctx.stroke()
  }
  
  /**
   * 渲染文本
   */
  renderText(ctx, x, y, text) {
    ctx.fillStyle = text.color || '#000000'
    ctx.font = `${text.fontSize || 12}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text.content, x, y)
  }
  
  /**
   * 降级重绘
   */
  fallbackRedraw(elements, scale, offset) {
    console.warn('Using fallback redraw')
    // 简单的全量重绘
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    elements.forEach(element => {
      this.renderElement(this.ctx, element, scale, offset)
    })
  }
  
  /**
   * 增量更新元素
   */
  updateElements(updatedElements, scale, offset) {
    // 添加到增量更新队列
    this.incrementalUpdater.scheduleBatch(updatedElements.map(el => el.id))
    
    // 处理批量更新
    this.incrementalUpdater.processBatch(
      updatedElements, 
      this.coordinateCache, 
      scale, 
      offset, 
      (element, scale, offset) => ({
        screenX: element.x * scale + offset.x,
        screenY: -element.y * scale + offset.y
      })
    )
    
    // 标记数据层为脏
    this.layeredCanvas.markDirty('data')
  }
  
  /**
   * 更新统计信息
   */
  updateStats(startTime, visibleCount) {
    const renderTime = performance.now() - startTime
    const now = Date.now()
    const fps = 1000 / (now - this.stats.lastFrameTime)
    
    this.stats = {
      renderTime,
      visibleElements: visibleCount,
      totalElements: this.stats.totalElements,
      fps: Math.min(fps, 60), // 限制最大FPS
      lastFrameTime: now
    }
  }
  
  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      spatialGrid: this.spatialGrid ? this.spatialGrid.getStats() : null,
      coordinateCache: this.coordinateCache.getStats(),
      layeredCanvas: this.layeredCanvas.getStats(),
      renderScheduler: this.renderScheduler.getStats(),
      incrementalUpdater: this.incrementalUpdater.getStats()
    }
  }
  
  /**
   * 销毁优化器
   */
  dispose() {
    if (this.worker) {
      this.worker.terminate()
    }
    
    this.layeredCanvas.dispose()
    this.coordinateCache.clear()
    this.incrementalUpdater.clear()
    
    if (this.spatialGrid) {
      this.spatialGrid.clear()
    }
  }
}

export default PerformanceOptimizerV2
