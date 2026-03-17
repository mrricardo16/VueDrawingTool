/**
 * 核心数据结构类型定义（JSDoc 注释，供 IDE/团队参考）
 */

/**
 * @typedef {Object} Point
 * @property {number} id - 唯一标识
 * @property {number} x - X 坐标
 * @property {number} y - Y 坐标
 * @property {string} type - 点类型（如 'point'/'site'/'rest'/'charging'）
 * @property {string} name - 名称
 * @property {string} color - 颜色
 * @property {number} angle - 角度
 * @property {Object} fields - 附加字段
 * @property {Array} mustFree - 约束/特殊用途
 * @property {string[]=} layerIds - 所属图层（可多选）
 * @property {string=} layerId - 兼容旧格式，单一图层
 */

/**
 * @typedef {Object} Line
 * @property {number} id
 * @property {number} startPointId
 * @property {number} endPointId
 * @property {string} mode - 选中模式
 * @property {string} name
 * @property {string} color
 * @property {number} angle
 * @property {Object} fields
 * @property {Array} mustFree
 * @property {string[]=} layerIds
 * @property {string=} layerId
 */

/**
 * @typedef {Object} BSpline
 * @property {number} id
 * @property {number} startPointId
 * @property {number} endPointId
 * @property {number[]=|undefined} controlPointIds
 * @property {Array<Point>=|undefined} controlPoints
 * @property {Object} params - 曲线参数
 * @property {string} mode
 * @property {string} name
 * @property {string} color
 * @property {number} angle
 * @property {Object} fields
 * @property {Array} mustFree
 * @property {string[]=} layerIds
 * @property {string=} layerId
 */

/**
 * @typedef {Object} TextElement
 * @property {number} id
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {string} color
 * @property {number} fontSize
 * @property {number} angle
 * @property {Object} fields
 * @property {Array} mustFree
 * @property {string[]=} layerIds
 * @property {string=} layerId
 */

/**
 * @typedef {Object} Area
 * @property {number} id
 * @property {Array<Point>} points - 区域顶点
 * @property {string} name
 * @property {string} color
 * @property {Object} fields
 * @property {Array} mustFree
 * @property {string[]=} layerIds
 * @property {string=} layerId
 */

// 其他结构可按需补充