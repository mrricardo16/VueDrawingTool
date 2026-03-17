/**
 * 事件处理工具类
 * 统一处理鼠标事件和节流逻辑
 */

export class EventUtils {
  /**
   * 创建节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  static throttle(func, delay) {
    let lastCall = 0
    return function(...args) {
      const now = performance.now()
      if (now - lastCall >= delay) {
        lastCall = now
        return func.apply(this, args)
      }
    }
  }

  /**
   * 创建防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  static debounce(func, delay) {
    let timeoutId
    return function(...args) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    }
  }

  /**
   * 创建动画帧节流函数
   * @param {Function} func - 要节流的函数
   * @returns {Function} 使用 requestAnimationFrame 节流的函数
   */
  static rafThrottle(func) {
    let rafId
    return function(...args) {
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          func.apply(this, args)
          rafId = null
        })
      }
    }
  }

  /**
   * 获取鼠标相对于Canvas的坐标
   * @param {MouseEvent} event - 鼠标事件
   * @param {HTMLCanvasElement} canvas - Canvas元素
   * @returns {Object} 相对坐标 {x, y}
   */
  static getRelativeMousePosition(event, canvas) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }

  /**
   * 检查点是否在Canvas边界内
   * @param {Object} point - 点坐标 {x, y}
   * @param {HTMLCanvasElement} canvas - Canvas元素
   * @returns {boolean} 是否在边界内
   */
  static isPointInCanvas(point, canvas) {
    return point.x >= 0 && point.x <= canvas.width && 
           point.y >= 0 && point.y <= canvas.height
  }

  /**
   * 限制点在Canvas边界内
   * @param {Object} point - 点坐标 {x, y}
   * @param {HTMLCanvasElement} canvas - Canvas元素
   * @returns {Object} 限制后的坐标 {x, y}
   */
  static clampToCanvas(point, canvas) {
    return {
      x: Math.max(0, Math.min(point.x, canvas.width)),
      y: Math.max(0, Math.min(point.y, canvas.height))
    }
  }

  /**
   * 创建事件发射器
   * @param {Object} context - Vue组件实例
   * @param {string} eventName - 事件名称
   * @returns {Function} 事件发射函数
   */
  static createEmitter(context, eventName) {
    return function(data) {
      context.$emit(eventName, data)
    }
  }

  /**
   * 批量创建事件发射器
   * @param {Object} context - Vue组件实例
   * @param {Array} eventNames - 事件名称数组
   * @returns {Object} 事件发射器对象
   */
  static createEmitters(context, eventNames) {
    const emitters = {}
    eventNames.forEach(name => {
      emitters[name] = EventUtils.createEmitter(context, name)
    })
    return emitters
  }
}
