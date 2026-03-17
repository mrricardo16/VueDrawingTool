/**
 * 对齐功能组合式 API Hook
 * 提供对齐相关的逻辑和状态管理
 */

import { ref, unref } from 'vue'
import { AlignmentUtils } from '../utils/alignmentUtils.js'

/**
 * @typedef {import('../models/types').Point} Point
 * @typedef {import('../models/types').TextElement} TextElement
 */

/**
 * 使用对齐功能
 * @param {{value: Point[]}|any} points - 点的响应式数据
 * @param {{value: TextElement[]}|any} texts - 文本的响应式数据
 * @returns {Object} 对齐功能的状态和方法
 */
export function useAlignment(points, texts) {
  // 对齐状态
  const isAligning = ref(false)
  const lastAlignmentType = ref(null)
  const alignmentHistory = ref([])

  /** @param {unknown} value */
  const normalizeIdArray = (value) => Array.isArray(value) ? value : []

  /** @param {unknown} source */
  const normalizeElements = (source) => {
    const resolved = unref(source)
    return Array.isArray(resolved) ? resolved : []
  }

  /** @param {number|string} left @param {number|string} right */
  const sameId = (left, right) => String(left) === String(right)

  /**
   * 执行对齐操作
   * @param {string} alignmentType - 对齐类型 ('horizontal' | 'vertical')
  * @param {Array<number|string>} selectedPointIds - 选中的点ID数组
  * @param {Array<number|string>} selectedTextIds - 选中的文本ID数组
   * @returns {Object|null} 对齐结果或null
   */
  const performAlignment = (alignmentType, selectedPointIds, selectedTextIds) => {
    const pointIds = normalizeIdArray(selectedPointIds)
    const textIds = normalizeIdArray(selectedTextIds)
    const pointList = normalizeElements(points)
    const textList = normalizeElements(texts)

    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) console.log('useAlignment: 执行对齐', alignmentType, {
        selectedPointIds: pointIds,
        selectedTextIds: textIds,
        selectedPointIdsLength: pointIds.length,
        selectedTextIdsLength: textIds.length
      })
    }

    // 验证选中元素
    if (pointIds.length === 0 && textIds.length === 0) {
      if (import.meta.env.DEV) console.log('useAlignment: 没有选中的元素，无法对齐')
      return null
    }

    isAligning.value = true
    lastAlignmentType.value = alignmentType

    try {
      // 收集选中元素
      const selectedElements = []
      
      // 添加选中的点
      pointIds.forEach(pointId => {
        const point = pointList.find(p => sameId(p.id, pointId))
        if (point) {
          selectedElements.push({ ...point, type: 'point' })
        }
      })
      
      // 添加选中的文本
      textIds.forEach(textId => {
        const text = textList.find(t => sameId(t.id, textId))
        if (text) {
          selectedElements.push({ ...text, type: 'text' })
        }
      })

      if (selectedElements.length < 2) {
        if (import.meta.env.DEV) console.log('useAlignment: 可对齐元素不足 2 个')
        return null
      }

      if (import.meta.env.DEV) console.log('useAlignment: 对齐选中的元素:', selectedElements)

      // 执行对齐计算
      const alignedElements = AlignmentUtils.alignElements(selectedElements, alignmentType)

      // 分离点和文本
      const alignedPoints = alignedElements.filter(el => el.type === 'point')
      const alignedTexts = alignedElements.filter(el => el.type === 'text')

      // 记录对齐历史
      alignmentHistory.value.push({
        type: alignmentType,
        timestamp: Date.now(),
        elementsCount: selectedElements.length,
        pointsCount: alignedPoints.length,
        textsCount: alignedTexts.length
      })

      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) console.log(`useAlignment: ${alignmentType}对齐完成`, {
          alignedPointsCount: alignedPoints.length,
          alignedTextsCount: alignedTexts.length
        })
      }

      return {
        alignedPoints,
        alignedTexts,
        originalElements: selectedElements
      }

    } catch (error) {
      console.error('useAlignment: 对齐操作失败', error)
      return null
    } finally {
      isAligning.value = false
    }
  }

  /**
   * 检查是否可以对齐
  * @param {Array<number|string>} selectedPointIds - 选中的点ID数组
  * @param {Array<number|string>} selectedTextIds - 选中的文本ID数组
   * @returns {boolean} 是否可以对齐
   */
  const canAlign = (selectedPointIds, selectedTextIds) => {
    return normalizeIdArray(selectedPointIds).length + normalizeIdArray(selectedTextIds).length >= 2
  }

  /**
   * 获取对齐统计信息
   * @returns {Object} 对齐统计信息
   */
  const getAlignmentStats = () => {
    return {
      totalAlignments: alignmentHistory.value.length,
      lastAlignmentType: lastAlignmentType.value,
      isAligning: isAligning.value,
      recentAlignments: alignmentHistory.value.slice(-5) // 最近5次对齐记录
    }
  }

  /**
   * 清空对齐历史
   */
  const clearAlignmentHistory = () => {
    alignmentHistory.value = []
    lastAlignmentType.value = null
  }

  return {
    // 状态
    isAligning,
    lastAlignmentType,
    alignmentHistory,
    
    // 方法
    performAlignment,
    canAlign,
    getAlignmentStats,
    clearAlignmentHistory
  }
}
