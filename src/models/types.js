/**
 * types.js
 *
 * 优化注释：
 * - 增加了模块职责的简洁说明。
 * - 为每个类型定义补充了更详细的字段描述。
 * - 对可选字段和默认值进行了说明。
 */

/**
 * 类型说明：
 * - Point: 表示地图中的点，包含坐标、类型、名称等信息。
 * - Line: 表示地图中的线段，包含起点、终点、模式等信息。
 * - BSpline: 表示 B 样条曲线，包含控制点、参数等信息。
 * - TextElement: 表示地图中的文本元素，包含位置、颜色、字体大小等信息。
 * - Area: 表示地图中的区域，包含顶点、颜色、名称等信息。
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