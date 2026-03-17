/**
 * 分层渲染系统
 * 背景层、数据层、UI层分离
 * 支持独立更新和缓存
 */

export class LayeredCanvas {
  /**
   * 分层渲染系统
   * @param {HTMLCanvasElement} mainCanvas - 主画布
   */
  constructor(mainCanvas) {
    this.mainCanvas = mainCanvas
    this.mainCtx = mainCanvas.getContext('2d')

    // 创建离屏画布层
    this.backgroundCanvas = this.createOffscreenCanvas()
    this.dataCanvas = this.createOffscreenCanvas()
    this.uiCanvas = this.createOffscreenCanvas()

    this.backgroundCtx = this.backgroundCanvas.getContext('2d')
    this.dataCtx = this.dataCanvas.getContext('2d')
    this.uiCtx = this.uiCanvas.getContext('2d')

    // 层级管理
    this.layers = {
      background: {
        canvas: this.backgroundCanvas,
        ctx: this.backgroundCtx,
        dirty: true,
        lastRender: 0
      },
      data: {
        canvas: this.dataCanvas,
        ctx: this.dataCtx,
        dirty: true,
        lastRender: 0
      },
      ui: {
        canvas: this.uiCanvas,
        ctx: this.uiCtx,
        dirty: true,
        lastRender: 0
      }
    }

    // 渲染统计
    this.stats = {
      backgroundRenders: 0,
      dataRenders: 0,
      uiRenders: 0,
      totalRenders: 0
    }
  }
  
  /**
   * 创建离屏画布
   */
  createOffscreenCanvas() {
    const canvas = document.createElement('canvas')
    canvas.width = this.mainCanvas.width
    canvas.height = this.mainCanvas.height
    return canvas
  }
  
  /**
   * 调整画布尺寸
   */
  resize(width, height) {
    // 更新主画布
    this.mainCanvas.width = width
    this.mainCanvas.height = height
    
    // 更新离屏画布
    Object.values(this.layers).forEach(layer => {
      layer.canvas.width = width
      layer.canvas.height = height
      layer.dirty = true // 标记需要重新渲染
    })
  }
  
  /**
   * 标记层级为脏
   */
  markDirty(layerName) {
    if (this.layers[layerName]) {
      this.layers[layerName].dirty = true
    }
  }
  
  /**
   * 标记所有层级为脏
   */
  markAllDirty() {
    Object.values(this.layers).forEach(layer => {
      layer.dirty = true
    })
  }
  
  /**
   * 渲染背景层（网格等静态内容）
   */
  renderBackground(renderFunction) {
    const layer = this.layers.background
    if (!layer.dirty) return
    
    const ctx = layer.ctx
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
    
    // 执行背景渲染
    renderFunction(ctx)
    
    layer.dirty = false
    layer.lastRender = Date.now()
    this.stats.backgroundRenders++
  }
  
  /**
   * 渲染数据层（点、线等动态内容）
   */
  renderData(renderFunction) {
    const layer = this.layers.data
    if (!layer.dirty) return
    
    const ctx = layer.ctx
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
    
    // 执行数据渲染
    renderFunction(ctx)
    
    layer.dirty = false
    layer.lastRender = Date.now()
    this.stats.dataRenders++
  }
  
  /**
   * 渲染UI层（选择框、预览等交互内容）
   */
  renderUI(renderFunction) {
    const layer = this.layers.ui
    if (!layer.dirty) return
    
    const ctx = layer.ctx
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
    
    // 执行UI渲染
    renderFunction(ctx)
    
    layer.dirty = false
    layer.lastRender = Date.now()
    this.stats.uiRenders++
  }
  
  /**
   * 合并所有层到主画布
   */
  composite() {
    const mainCtx = this.mainCtx
    
    // 清空主画布
    mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height)
    
    // 按顺序合成各层
    mainCtx.drawImage(this.backgroundCanvas, 0, 0)
    mainCtx.drawImage(this.dataCanvas, 0, 0)
    mainCtx.drawImage(this.uiCanvas, 0, 0)
    
    this.stats.totalRenders++
  }
  
  /**
   * 智能渲染：只渲染脏层
   */
  smartRender(renderers) {
    let needsComposite = false
    
    // 渲染背景层（低频）
    if (this.layers.background.dirty && renderers.background) {
      this.renderBackground(renderers.background)
      needsComposite = true
    }
    
    // 渲染数据层（高频）
    if (this.layers.data.dirty && renderers.data) {
      this.renderData(renderers.data)
      needsComposite = true
    }
    
    // 渲染UI层（中频）
    if (this.layers.ui.dirty && renderers.ui) {
      this.renderUI(renderers.ui)
      needsComposite = true
    }
    
    // 合成到主画布
    if (needsComposite) {
      this.composite()
    }
  }
  
  /**
   * 批量更新数据层
   */
  updateDataBatch(updates) {
    const ctx = this.layers.data.ctx
    
    // 批量应用更新
    updates.forEach(update => {
      update(ctx)
    })
    
    // 标记为脏但不立即渲染
    this.layers.data.dirty = true
  }
  
  /**
   * 获取层级状态
   */
  getLayerStatus() {
    return Object.entries(this.layers).map(([name, layer]) => ({
      name,
      dirty: layer.dirty,
      lastRender: layer.lastRender,
      timeSinceRender: Date.now() - layer.lastRender
    }))
  }
  
  /**
   * 获取渲染统计
   */
  getStats() {
    return {
      ...this.stats,
      layerStatus: this.getLayerStatus(),
      totalRenders: this.stats.totalRenders
    }
  }
  
  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      backgroundRenders: 0,
      dataRenders: 0,
      uiRenders: 0,
      totalRenders: 0
    }
  }
  
  /**
   * 销毁资源
   */
  dispose() {
    // 清理离屏画布
    Object.values(this.layers).forEach(layer => {
      const ctx = layer.ctx
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
    })
  }
}

/**
 * 渲染调度器
 * 智能调度各层级的渲染时机
 */
export class RenderScheduler {
  constructor(layeredCanvas) {
    this.layeredCanvas = layeredCanvas
    this.renderQueue = []
    this.isRendering = false
    this.targetFPS = 60
    this.frameInterval = 1000 / this.targetFPS
    this.lastFrameTime = 0
  }
  
  /**
   * 调度渲染任务
   */
  schedule(renderFunction, priority = 'normal') {
    this.renderQueue.push({
      renderFunction,
      priority,
      timestamp: Date.now()
    })
    
    // 按优先级排序
    this.renderQueue.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    
    this.scheduleNextFrame()
  }
  
  /**
   * 调度下一帧
   */
  scheduleNextFrame() {
    if (this.isRendering) return
    
    const now = Date.now()
    if (now - this.lastFrameTime >= this.frameInterval) {
      requestAnimationFrame(() => this.processQueue())
    }
  }
  
  /**
   * 处理渲染队列
   */
  async processQueue() {
    if (this.isRendering || this.renderQueue.length === 0) return
    
    this.isRendering = true
    this.lastFrameTime = Date.now()
    
    try {
      // 批量处理队列中的任务
      const batch = this.renderQueue.splice(0, 10) // 每帧最多处理10个任务
      
      batch.forEach(task => {
        task.renderFunction()
      })
      
      // 合成到主画布
      this.layeredCanvas.composite()
      
    } finally {
      this.isRendering = false
      
      // 如果还有任务，继续调度
      if (this.renderQueue.length > 0) {
        this.scheduleNextFrame()
      }
    }
  }
  
  /**
   * 清空队列
   */
  clearQueue() {
    this.renderQueue = []
    this.isRendering = false
  }
  
  /**
   * 获取调度统计
   */
  getStats() {
    return {
      queueLength: this.renderQueue.length,
      isRendering: this.isRendering,
      targetFPS: this.targetFPS,
      lastFrameTime: this.lastFrameTime
    }
  }
}

export default LayeredCanvas
