/**
 * 鼠标命中检测策略层
 * 统一定义元素命中优先级，避免组件内部重复编排。
 */

/**
 * @typedef {import('../../models/types').HitResult} HitResult
 * @typedef {Object} HitTestAccessors
 * @property {(x:number, y:number)=>any} getPointAt
 * @property {(x:number, y:number)=>any} getTextAt
 * @property {(x:number, y:number)=>any} getBsplineAt
 * @property {(x:number, y:number)=>any} getLineAt
 * @property {(x:number, y:number)=>any} getAreaAt
 */

/**
 * @param {HitTestAccessors} accessors
 */
export function createMouseHitTestStrategy(accessors) {
  const {
    getPointAt,
    getTextAt,
    getBsplineAt,
    getLineAt,
    getAreaAt
  } = accessors

  const orderedMatchers = [
    { type: 'point', finder: getPointAt },
    { type: 'text', finder: getTextAt },
    { type: 'bspline', finder: getBsplineAt },
    { type: 'line', finder: getLineAt },
    { type: 'area', finder: getAreaAt }
  ]

  /**
   * @param {number} worldX
   * @param {number} worldY
   * @returns {HitResult|null}
   */
  function findFirstAt(worldX, worldY) {
    for (const item of orderedMatchers) {
      const target = item.finder(worldX, worldY)
      if (target) {
        return {
          type: item.type,
          target
        }
      }
    }
    return null
  }

  return {
    findFirstAt
  }
}
