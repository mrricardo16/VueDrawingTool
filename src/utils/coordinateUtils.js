/**
 * 坐标转换工具类
 * 统一处理屏幕坐标和世界坐标之间的转换
 */

export class CoordinateUtils {
  /**
   * 将屏幕坐标转换为世界坐标
   * @param {number} screenX - 屏幕X坐标
   * @param {number} screenY - 屏幕Y坐标
   * @param {number} scale - 缩放比例
   * @param {Object} offset - 偏移量 {x, y}
   * @returns {Object} 世界坐标 {x, y}
   */
  static screenToWorld(screenX, screenY, scale, offset) {
    return {
      x: (screenX - (offset?.x || 0)) / scale,
      y: -(screenY - (offset?.y || 0)) / scale
    }
  }

  /**
   * 将世界坐标转换为屏幕坐标
   * @param {number} worldX - 世界X坐标
   * @param {number} worldY - 世界Y坐标
   * @param {number} scale - 缩放比例
   * @param {Object} offset - 偏移量 {x, y}
   * @returns {Object} 屏幕坐标 {x, y}
   */
  static worldToScreen(worldX, worldY, scale, offset) {
    return {
      x: worldX * scale + (offset?.x || 0),
      y: -worldY * scale + (offset?.y || 0)
    }
  }

  /**
   * 计算两点之间的距离
   * @param {Object} point1 - 第一个点 {x, y}
   * @param {Object} point2 - 第二个点 {x, y}
   * @returns {number} 距离
   */
  static distance(point1, point2) {
    const dx = point1.x - point2.x
    const dy = point1.y - point2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 根据缩放比例计算检测阈值
   * @param {number} baseThreshold - 基础阈值（像素）
   * @param {number} scale - 缩放比例
   * @returns {number} 世界坐标中的阈值
   */
  static getThreshold(baseThreshold, scale) {
    return baseThreshold / scale
  }
}
