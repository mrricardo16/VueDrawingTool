/**
 * 虚拟化渲染器
 * 只渲染可见区域内的元素，解决大数据量渲染卡顿问题
 */

export class VirtualizedRenderer {
  /**
   * 虚拟化渲染器
   * @param {HTMLCanvasElement} canvas - 渲染目标画布
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   */
  constructor(canvas, ctx) {
    this.canvas = canvas
    this.ctx = ctx
    this.viewport = { x: 0, y: 0, width: 0, height: 0 }
    this.scale = 1
    this.offset = { x: 0, y: 0 }
    this.renderCache = new Map()
    this.lastRenderTime = 0
  }

  /**
   * 更新视口信息
   */
  updateViewport(scale, offset) {
    this.scale = scale
    this.offset = offset
    this.viewport = {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height
    }
  }

  /**
   * 获取可见区域边界（世界坐标）
   */
  getVisibleBounds() {
    const padding = 200 // 额外渲染边界，避免边缘闪烁
    const minX = (-this.offset.x - padding) / this.scale
    const maxX = (this.canvas.width - this.offset.x + padding) / this.scale
    const minY = -(this.canvas.height - this.offset.y + padding) / this.scale
    const maxY = (-this.offset.y - padding) / this.scale
    
    return { minX, minY, maxX, maxY }
  }

  /**
   * 检查元素是否在可见区域内
   */
  isElementVisible(element) {
    const bounds = this.getVisibleBounds()
    
    if (element.x !== undefined && element.y !== undefined) {
      return element.x >= bounds.minX && 
             element.x <= bounds.maxX &&
             element.y >= bounds.minY && 
             element.y <= bounds.maxY
    }
    
    // 对于线条等复杂元素，检查边界框
    if (element.bounds) {
      return !(element.bounds.maxX < bounds.minX || 
               element.bounds.minX > bounds.maxX || 
               element.bounds.maxY < bounds.minY || 
               element.bounds.minY > bounds.maxY)
    }
    
    return true // 默认渲染
  }

  /**
   * 虚拟化绘制点
   */
  drawVisiblePoints(points, selectedPoints, curveState) {
    const visiblePoints = points.filter(point => this.isElementVisible(point))
    
    this.ctx.save()
    
    visiblePoints.forEach(point => {
      const screenCoords = this.worldToScreen(point.x, point.y)
      const isSelected = selectedPoints.includes(point.id)
      
      // 使用缓存或计算样式
      const cacheKey = `point_${point.type}_${isSelected ? 'selected' : 'normal'}`
      let style = this.renderCache.get(cacheKey)
      
      if (!style) {
        style = {
          fillColor: this.getPointColor(point, isSelected),
          radius: this.getPointRadius(point, isSelected)
        }
        this.renderCache.set(cacheKey, style)
      }
      
      // 绘制点
      this.ctx.beginPath()
      this.ctx.arc(screenCoords.x, screenCoords.y, style.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = style.fillColor
      this.ctx.fill()
      
      // 绘制特殊图标
      this.drawSpecialIcon(point, screenCoords)
    })
    
    this.ctx.restore()
  }

  /**
   * 虚拟化绘制线条
   */
  drawVisibleLines(lines, points, selectedLines) {
    const visibleLines = lines.filter(line => {
      const startPoint = points.find(p => p.id === line.startPointId)
      const endPoint = points.find(p => p.id === line.endPointId)
      
      if (!startPoint || !endPoint) return false
      
      // 检查线条边界框
      const lineBounds = {
        minX: Math.min(startPoint.x, endPoint.x),
        maxX: Math.max(startPoint.x, endPoint.x),
        minY: Math.min(startPoint.y, endPoint.y),
        maxY: Math.max(startPoint.y, endPoint.y)
      }
      
      return this.isElementVisible({ ...line, bounds: lineBounds })
    })
    
    this.ctx.save()
    
    visibleLines.forEach(line => {
      const startPoint = points.find(p => p.id === line.startPointId)
      const endPoint = points.find(p => p.id === line.endPointId)
      
      if (!startPoint || !endPoint) return
      
      const startScreen = this.worldToScreen(startPoint.x, startPoint.y)
      const endScreen = this.worldToScreen(endPoint.x, endPoint.y)
      const isSelected = selectedLines.includes(line.id)
      
      // 绘制线条
      this.ctx.beginPath()
      this.ctx.moveTo(startScreen.x, startScreen.y)
      this.ctx.lineTo(endScreen.x, endScreen.y)
      this.ctx.strokeStyle = isSelected ? '#ffe66d' : '#B8C5D6'
      this.ctx.lineWidth = isSelected ? 2 : 1
      this.ctx.stroke()
      
      // 绘制方向箭头
      if (line.mode === 'single') {
        this.drawDirectionArrow(startScreen, endScreen, isSelected)
      }
    })
    
    this.ctx.restore()
  }

  /**
   * 虚拟化绘制曲线
   */
  drawVisibleBsplines(bsplines, points, selectedBsplines) {
    const visibleBsplines = bsplines.filter(bspline => {
      const startPoint = points.find(p => p.id === bspline.startPointId)
      const endPoint = points.find(p => p.id === bspline.endPointId)
      
      if (!startPoint || !endPoint) return false
      
      // 计算曲线边界框
      let minX = Math.min(startPoint.x, endPoint.x)
      let maxX = Math.max(startPoint.x, endPoint.x)
      let minY = Math.min(startPoint.y, endPoint.y)
      let maxY = Math.max(startPoint.y, endPoint.y)
      
      // 包含控制点
      if (bspline.controlPoints) {
        bspline.controlPoints.forEach(cp => {
          minX = Math.min(minX, cp.x)
          maxX = Math.max(maxX, cp.x)
          minY = Math.min(minY, cp.y)
          maxY = Math.max(maxY, cp.y)
        })
      }
      
      const bsplineBounds = { minX, maxX, minY, maxY }
      return this.isElementVisible({ ...bspline, bounds: bsplineBounds })
    })
    
    this.ctx.save()
    
    visibleBsplines.forEach(bspline => {
      const startPoint = points.find(p => p.id === bspline.startPointId)
      const endPoint = points.find(p => p.id === bspline.endPointId)
      
      if (!startPoint || !endPoint) return
      
      const isSelected = selectedBsplines.includes(bspline.id)
      
      // 绘制B样条曲线
      this.drawBSpline(startPoint, endPoint, bspline.controlPoints, isSelected)
    })
    
    this.ctx.restore()
  }

  /**
   * 绘制B样条曲线
   */
  drawBSpline(startPoint, endPoint, controlPoints, isSelected) {
    if (!controlPoints || controlPoints.length === 0) {
      // 退化为直线
      const startScreen = this.worldToScreen(startPoint.x, startPoint.y)
      const endScreen = this.worldToScreen(endPoint.x, endPoint.y)
      
      this.ctx.beginPath()
      this.ctx.moveTo(startScreen.x, startScreen.y)
      this.ctx.lineTo(endScreen.x, endScreen.y)
      this.ctx.strokeStyle = isSelected ? '#ffe66d' : '#B8C5D6'
      this.ctx.lineWidth = isSelected ? 2 : 1
      this.ctx.stroke()
      return
    }
    
    // 绘制真正的B样条曲线
    this.ctx.beginPath()
    this.ctx.strokeStyle = isSelected ? '#ffe66d' : '#B8C5D6'
    this.ctx.lineWidth = isSelected ? 2 : 1
    
    const startScreen = this.worldToScreen(startPoint.x, startPoint.y)
    this.ctx.moveTo(startScreen.x, startScreen.y)
    
    // 简化的二次贝塞尔曲线绘制
    const points = [startPoint, ...controlPoints, endPoint]
    for (let i = 0; i < points.length - 1; i++) {
      const current = this.worldToScreen(points[i].x, points[i].y)
      const next = this.worldToScreen(points[i + 1].x, points[i + 1].y)
      
      if (i === 0) {
        this.ctx.lineTo(current.x, current.y)
      }
      
      // 使用二次贝塞尔曲线
      if (i < points.length - 2) {
        const control = this.worldToScreen(
          (points[i].x + points[i + 1].x) / 2,
          (points[i].y + points[i + 1].y) / 2
        )
        this.ctx.quadraticCurveTo(control.x, control.y, next.x, next.y)
      } else {
        this.ctx.lineTo(next.x, next.y)
      }
    }
    
    this.ctx.stroke()
  }

  /**
   * 坐标转换
   */
  worldToScreen(x, y) {
    return {
      x: x * this.scale + this.offset.x,
      y: -y * this.scale + this.offset.y
    }
  }

  /**
   * 绘制特殊图标
   */
  drawSpecialIcon(point, screenCoords) {
    const iconSize = Math.max(12, 8 * this.scale)
    
    this.ctx.save()
    this.ctx.font = `${iconSize}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    switch (point.type) {
      case 'charging':
        this.ctx.fillText('⚡', screenCoords.x, screenCoords.y)
        break
      case 'rest':
        this.ctx.fillText('🛏', screenCoords.x, screenCoords.y)
        break
      case 'site':
        this.ctx.fillText('🏭', screenCoords.x, screenCoords.y)
        break
    }
    
    this.ctx.restore()
  }

  /**
   * 绘制方向箭头
   */
  drawDirectionArrow(startScreen, endScreen, isSelected) {
    const dx = endScreen.x - startScreen.x
    const dy = endScreen.y - startScreen.y
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return
    
    const unitX = dx / length
    const unitY = dy / length
    const midX = startScreen.x + dx / 2
    const midY = startScreen.y + dy / 2
    
    const arrowSize = Math.max(8, 5 * this.scale)
    const arrowWidth = Math.max(6, 4 * this.scale)
    
    // 绘制箭头
    this.ctx.beginPath()
    this.ctx.moveTo(midX + unitX * arrowSize, midY + unitY * arrowSize)
    this.ctx.lineTo(
      midX - unitX * arrowSize/2 - unitY * arrowWidth/2,
      midY - unitY * arrowSize/2 + unitX * arrowWidth/2
    )
    this.ctx.lineTo(
      midX - unitX * arrowSize/2 + unitY * arrowWidth/2,
      midY - unitY * arrowSize/2 - unitX * arrowWidth/2
    )
    this.ctx.closePath()
    this.ctx.strokeStyle = isSelected ? '#ffe66d' : '#B8C5D6'
    this.ctx.lineWidth = 1
    this.ctx.stroke()
  }

  /**
   * 获取点颜色
   */
  getPointColor(point, isSelected) {
    if (isSelected) return '#ff6b6b'
    if (point.color) return point.color
    
    switch (point.type) {
      case 'charging': return '#4CAF50'
      case 'rest': return '#2196F3'
      case 'site': return '#FF9800'
      default: return '#B8C5D6'
    }
  }

  /**
   * 获取点半径
   */
  getPointRadius(point, isSelected) {
    const baseRadius = isSelected ? 6 : 4
    return Math.max(baseRadius, 3 * this.scale)
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.renderCache.clear()
  }
}

export default VirtualizedRenderer
