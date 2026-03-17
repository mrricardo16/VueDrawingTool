/**
 * BSplineCalculator.js
 * 专门负责B样条曲线计算的类，职责抽离，避免代码堆叠
 * 提供缓存机制和优化的数学计算
 */

import { calcBSplinePoint, buildOpenKnots, calcQuadraticBezier, sampleCurve } from './bsplineMath.js'

export class BSplineCalculator {
  constructor() {
    // 世界坐标点缓存 - key: bsplineId_params
    this.worldPointsCache = new Map()
    // 基函数计算缓冲区复用
    this.basisBuffers = null
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.worldPointsCache.clear()
  }

  /**
   * 获取或构建世界坐标点集（带缓存）
   * @param {string} cacheKey - 缓存键
   * @param {Object} startPoint - 起点
   * @param {Object} endPoint - 终点  
   * @param {Array} controlPoints - 控制点数组
   * @param {number} segments - 采样段数
   * @returns {Array} 世界坐标点集
   */
  getOrBuildWorldPoints(cacheKey, startPoint, endPoint, controlPoints, segments) {
    let points = this.worldPointsCache.get(cacheKey)
    if (points) return points

    // 生成世界坐标点集
    points = this._generateWorldPoints(startPoint, endPoint, controlPoints, segments)
    this.worldPointsCache.set(cacheKey, points)
    return points
  }

  /**
   * 生成世界坐标点集
   * @private
   */
  _generateWorldPoints(startPoint, endPoint, controlPoints, segments) {
    if (controlPoints.length === 0) {
      // 直线情况 - 优化：减少对象创建
      const dx = endPoint.x - startPoint.x
      const dy = endPoint.y - startPoint.y
      const points = new Array(segments + 1)
      for (let i = 0; i <= segments; i++) {
        const t = i / segments
        points[i] = {
          x: startPoint.x + dx * t,
          y: startPoint.y + dy * t
        }
      }
      return points
    }

    if (controlPoints.length === 1) {
      // 二次贝塞尔情况
      const points = new Array(segments + 1)
      for (let i = 0; i <= segments; i++) {
        points[i] = calcQuadraticBezier(startPoint, controlPoints[0], endPoint, i / segments)
      }
      return points
    }

    // B样条情况
    return this._generateBSplinePoints(startPoint, endPoint, controlPoints, segments)
  }

  /**
   * 生成B样条点集
   * @private
   */
  _generateBSplinePoints(startPoint, endPoint, controlPoints, segments) {
    const allPoints = [startPoint, ...controlPoints, endPoint]
    const degree = 3
    const n = allPoints.length - 1
    const knots = buildOpenKnots(n, degree)
    
    // 确保基函数缓冲区存在
    this._ensureBasisBuffers(degree)
    
    // 优化：预分配数组大小
    const points = new Array(segments + 1)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      
      if (t <= 0) {
        points[i] = { x: startPoint.x, y: startPoint.y } // 创建副本
        continue
      }
      if (t >= 1) {
        points[i] = { x: endPoint.x, y: endPoint.y } // 创建副本
        continue
      }

      const u = t * (n - degree + 1)
      points[i] = calcBSplinePoint(allPoints, knots, degree, u, this.basisBuffers)
    }
    
    return points
  }

  /**
   * 确保基函数缓冲区存在
   * @private
   */
  _ensureBasisBuffers(degree) {
    if (!this.basisBuffers || this.basisBuffers.N.length !== degree + 1) {
      this.basisBuffers = {
        N: new Array(degree + 1),
        left: new Array(degree + 1),
        right: new Array(degree + 1)
      }
    }
  }

  /**
   * 计算曲线中点位置（用于方向箭头）
   * @param {Array} worldPoints - 世界坐标点集
   * @param {number} scale - 缩放比例
   * @param {Object} offset - 偏移量
   * @returns {Object} 包含中点位置和方向信息的对象
   */
  calculateCurveMidpoint(worldPoints, scale, offset) {
    if (worldPoints.length < 2) return null

    // 转换为屏幕坐标
    const screenPoints = worldPoints.map(p => ({
      x: p.x * scale + (offset?.x || 0),
      y: -p.y * scale + (offset?.y || 0)
    }))

    // 计算总长度
    let totalLength = 0
    for (let i = 1; i < screenPoints.length; i++) {
      const dx = screenPoints[i].x - screenPoints[i - 1].x
      const dy = screenPoints[i].y - screenPoints[i - 1].y
      totalLength += Math.sqrt(dx * dx + dy * dy)
    }

    // 找到长度一半的位置
    let currentLength = 0
    let midIndex = Math.floor(screenPoints.length / 2)
    
    for (let i = 1; i < screenPoints.length; i++) {
      const dx = screenPoints[i].x - screenPoints[i - 1].x
      const dy = screenPoints[i].y - screenPoints[i - 1].y
      const segmentLength = Math.sqrt(dx * dx + dy * dy)
      
      if (currentLength + segmentLength >= totalLength / 2) {
        midIndex = i
        break
      }
      currentLength += segmentLength
    }

    // 计算中点位置的切线方向
    const prevIndex = Math.max(0, midIndex - 1)
    const nextIndex = Math.min(screenPoints.length - 1, midIndex + 1)
    
    const dx = screenPoints[nextIndex].x - screenPoints[prevIndex].x
    const dy = screenPoints[nextIndex].y - screenPoints[prevIndex].y
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return null

    return {
      position: screenPoints[midIndex],
      direction: {
        x: dx / length,
        y: dy / length
      }
    }
  }

  /**
   * 直接生成世界坐标点集（不走缓存）。
   * 用于拖拽预览等瞬态场景——每帧控制点都不同，缓存命中率为零，
   * 跳过缓存查询可减少一次 Map.get + 一次 Map.set 的开销。
   * @param {Object} startPoint
   * @param {Object} endPoint
   * @param {Array}  controlPoints
   * @param {number} segments
   * @returns {Array} 世界坐标点集
   */
  generateWorldPointsNow(startPoint, endPoint, controlPoints, segments) {
    return this._generateWorldPoints(startPoint, endPoint, controlPoints, segments)
  }

  /**
   * 生成缓存键（优化版本）
   * @param {string} bsplineId - B样条ID
   * @param {Object} startPoint - 起点
   * @param {Object} endPoint - 终点
   * @param {Array} controlPoints - 控制点
   * @param {Object} params - 参数
   * @returns {string} 缓存键
   */
  generateCacheKey(bsplineId, startPoint, endPoint, controlPoints, params) {
    const segments = params.segments || 50
    // 使用更精确的哈希，避免冲突但保持高效
    const coords = [
      startPoint.x, startPoint.y,
      endPoint.x, endPoint.y
    ]
    controlPoints.forEach(cp => {
      coords.push(cp.x, cp.y)
    })
    
    // 简单的数值哈希函数
    const hash = coords.reduce((h, val) => {
      const num = Math.round(val * 100) // 保留2位小数精度
      return ((h << 5) - h) + num // 简单哈希算法
    }, 0)
    
    return `${bsplineId}_${segments}_${Math.abs(hash)}`
  }
}
