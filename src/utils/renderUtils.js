/**
 * 渲染工具类
 * 统一处理Canvas绘制相关的通用逻辑
 */

export class RenderUtils {
  /**
   * 绘制点的基本形状
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {number} x - 屏幕X坐标
   * @param {number} y - 屏幕Y坐标
   * @param {number} radius - 半径
   * @param {string} fillColor - 填充颜色
   */
  static drawPoint(ctx, x, y, radius, fillColor) {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = fillColor
    ctx.fill()
  }

  static drawFilledRect(ctx, centerX, centerY, size, fillColor, strokeColor = null, lineWidth = 2) {
    const half = size / 2
    ctx.fillStyle = fillColor
    ctx.fillRect(centerX - half, centerY - half, size, size)
    if (strokeColor) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = lineWidth
      ctx.strokeRect(centerX - half, centerY - half, size, size)
    }
  }

  static isSitePoint(point) {
    return point && (point.type === 'charging' || point.type === 'rest' || point.type === 'site')
  }

  static getSiteFillColor(point) {
    switch (point?.type) {
      case 'charging':
        return '#ff9800'
      case 'rest':
        return '#9c27b0'
      case 'site':
        return '#2196f3'
      default:
        return '#A0826D'
    }
  }

  /**
   * 绘制线条
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {number} x1 - 起点X坐标
   * @param {number} y1 - 起点Y坐标
   * @param {number} x2 - 终点X坐标
   * @param {number} y2 - 终点Y坐标
   * @param {string} strokeColor - 线条颜色
   * @param {number} lineWidth - 线条宽度
   */
  static drawLine(ctx, x1, y1, x2, y2, strokeColor, lineWidth = 2) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  /**
   * 绘制文本
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {string} text - 文本内容
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} color - 文本颜色
   * @param {number} fontSize - 字体大小
   * @param {string} textAlign - 文本对齐方式
   */
  static drawText(ctx, text, x, y, color, fontSize, textAlign = 'center') {
    ctx.fillStyle = color
    ctx.font = `${fontSize}px Arial`
    ctx.textAlign = textAlign
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y)
  }

  /**
   * 绘制选择框
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {string} strokeColor - 边框颜色
   * @param {number} lineWidth - 线条宽度
   * @param {Array} dashPattern - 虚线模式
   */
  static drawRect(ctx, x, y, width, height, strokeColor, lineWidth = 2, dashPattern = []) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    if (dashPattern.length > 0) {
      ctx.setLineDash(dashPattern)
    }
    ctx.strokeRect(x, y, width, height)
    if (dashPattern.length > 0) {
      ctx.setLineDash([])
    }
  }

  /**
   * 绘制箭头
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {number} fromX - 起点X坐标
   * @param {number} fromY - 起点Y坐标
   * @param {number} toX - 终点X坐标
   * @param {number} toY - 终点Y坐标
   * @param {string} color - 箭头颜色
   * @param {number} size - 箭头大小
   */
  static drawArrow(ctx, fromX, fromY, toX, toY, color, size = 10) {
    const angle = Math.atan2(toY - fromY, toX - fromX)
    
    // 计算箭头的两个点
    const arrowPoint1 = {
      x: toX - size * Math.cos(angle - Math.PI / 6),
      y: toY - size * Math.sin(angle - Math.PI / 6)
    }
    
    const arrowPoint2 = {
      x: toX - size * Math.cos(angle + Math.PI / 6),
      y: toY - size * Math.sin(angle + Math.PI / 6)
    }
    
    // 绘制箭头
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(arrowPoint1.x, arrowPoint1.y)
    ctx.lineTo(arrowPoint2.x, arrowPoint2.y)
    ctx.closePath()
    
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.stroke()
  }

  /**
   * 获取点类型的颜色
   * @param {Object} point - 点对象
   * @param {boolean} isSelected - 是否选中
   * @param {Object} curveState - 曲线状态
   * @returns {string} 颜色值
   */
  static getPointColor(point, isSelected, curveState = {}) {
    // 优先级：选中状态 > 曲线状态 > 站点类型
    if (curveState.isStartPoint?.id === point.id) {
      return '#ff6b6b'  // 红色起点
    } else if (curveState.isEndPoint?.id === point.id) {
      return '#4ecdc4'  // 青色终点
    } else if (curveState.isControlPoint?.id === point.id) {
      return '#ffd93d'  // 黄色控制点
    } else if (isSelected) {
      return '#ffe66d'  // 浅黄色选中状态
    }
    
    // 根据站点类型返回颜色
    switch (point.type) {
      case 'charging':
        return '#ff9800'  // 橙色 - 充电站
      case 'rest':
        return '#9c27b0'  // 紫色 - 休息点
      case 'site':
        return '#2196f3'  // 蓝色 - 站点
      default:
        return '#A0826D'  // 浅棕色 - 普通点
    }
  }

  /**
   * 获取点的半径
   * @param {Object} point - 点对象
   * @param {boolean} isSelected - 是否选中
   * @param {Object} curveState - 曲线状态
   * @returns {number} 半径值
   */
  static getPointRadius(point, isSelected, curveState = {}) {
    let radius = 5 // 默认半径
    
    if (curveState.isStartPoint?.id === point.id || curveState.isEndPoint?.id === point.id) {
      radius = 7
    } else if (curveState.isControlPoint?.id === point.id) {
      radius = 4
    } else if (isSelected) {
      radius = 6
    }
    
    return radius
  }
}
