/**
 * 对齐工具类
 * 提供元素对齐相关的静态方法
 */
export class AlignmentUtils {
  /**
   * 水平对齐 - 将所有元素对齐到同一Y坐标
   * @param {Array} elements - 要对齐的元素数组
   * @returns {number} 对齐后的Y坐标
   */
  static alignHorizontal(elements) {
    if (elements.length === 0) return 0
    // 使用第一个元素的Y坐标作为对齐基准
    return elements[0].y
  }

  /**
   * 垂直对齐 - 将所有元素对齐到同一X坐标
   * @param {Array} elements - 要对齐的元素数组
   * @returns {number} 对齐后的X坐标
   */
  static alignVertical(elements) {
    if (elements.length === 0) return 0
    // 使用第一个元素的X坐标作为对齐基准
    return elements[0].x
  }

  /**
   * 执行对齐操作
   * @param {Array} elements - 要对齐的元素数组
   * @param {string} alignmentType - 对齐类型 ('horizontal' 或 'vertical')
   * @returns {Array} 对齐后的元素数组
   */
  static alignElements(elements, alignmentType) {
    if (elements.length === 0) return elements

    const alignedElements = [...elements]

    switch (alignmentType) {
      case 'horizontal':
        const targetY = this.alignHorizontal(elements)
        alignedElements.forEach(element => {
          element.y = targetY
        })
        break
      case 'vertical':
        const targetX = this.alignVertical(elements)
        alignedElements.forEach(element => {
          element.x = targetX
        })
        break
      default:
        console.warn(`未知的对齐类型: ${alignmentType}`)
        return elements
    }

    return alignedElements
  }

  /**
   * 检查是否可以对齐
   * @param {Array} elements - 要检查的元素数组
   * @returns {boolean} 是否可以对齐
   */
  static canAlign(elements) {
    return elements && elements.length >= 2
  }

  /**
   * 获取元素的边界信息
   * @param {Array} elements - 元素数组
   * @returns {Object} 边界信息 {minX, maxX, minY, maxY}
   */
  static getBounds(elements) {
    if (elements.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }

    const xCoords = elements.map(el => el.x)
    const yCoords = elements.map(el => el.y)

    return {
      minX: Math.min(...xCoords),
      maxX: Math.max(...xCoords),
      minY: Math.min(...yCoords),
      maxY: Math.max(...yCoords)
    }
  }
}
