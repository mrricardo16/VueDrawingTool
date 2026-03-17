/**
 * hitTesting.js
 * 纯函数：根据世界坐标判断是否命中某元素。
 * 从 MouseEventHandler 中提取，使其不再耦合空间查询实现。
 */

import { calcCurvePoint } from './bsplineMath.js'

// ─── 基础几何工具 ────────────────────────────────────────────────────────

/** 点到线段的最短距离 */
export function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const Cx = bx - ax, Cy = by - ay
  const lenSq = Cx * Cx + Cy * Cy
  let t = lenSq ? ((px - ax) * Cx + (py - ay) * Cy) / lenSq : 0
  t = Math.max(0, Math.min(1, t))
  const nearX = ax + t * Cx
  const nearY = ay + t * Cy
  const dx = px - nearX, dy = py - nearY
  return Math.sqrt(dx * dx + dy * dy)
}

/** 判断两条线段是否相交 */
export function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 1e-10) return false
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

/**
 * 判断线段 (x1,y1)-(x2,y2) 是否与矩形 box 相交
 * @param {{x1,y1,x2,y2}} box
 */
export function segmentIntersectsBox(sx1, sy1, sx2, sy2, box) {
  if (sx1 >= box.x1 && sx1 <= box.x2 && sy1 >= box.y1 && sy1 <= box.y2) return true
  if (sx2 >= box.x1 && sx2 <= box.x2 && sy2 >= box.y1 && sy2 <= box.y2) return true
  const edges = [
    [box.x1, box.y1, box.x2, box.y1],
    [box.x2, box.y1, box.x2, box.y2],
    [box.x2, box.y2, box.x1, box.y2],
    [box.x1, box.y2, box.x1, box.y1]
  ]
  return edges.some(([ex1, ey1, ex2, ey2]) =>
    segmentsIntersect(sx1, sy1, sx2, sy2, ex1, ey1, ex2, ey2)
  )
}

// ─── 单元素命中检测 ──────────────────────────────────────────────────────

/**
 * 获取点的图层ID
 * @param {Object} point - 点对象
 * @returns {string} 图层ID
 */
function getPointLayerId(point) {
  if (Array.isArray(point.layerIds) && point.layerIds.length > 0) {
    return point.layerIds[0] // 返回第一个图层ID
  }
  if (point.layerId) {
    return point.layerId
  }
  if (point.layername) {
    return point.layername
  }
  return 'g' // 默认图层
}

/**
 * 检查同一图层是否存在重合点
 * @param {SpatialGrid} grid - 空间网格
 * @param {Object} newPoint - 新点
 * @param {number} scale - 缩放比例
 * @param {Array} scratch - 临时数组
 * @param {string} excludeLayerId - 排除的图层ID（用于检查其他图层）
 * @returns {boolean} 是否存在重合点
 */
export function hasOverlappingPointInLayer(grid, newPoint, scale, scratch, excludeLayerId = null) {
  const threshold = 8 / scale // 重合阈值
  const candidates = grid.query(
    newPoint.x - threshold, 
    newPoint.y - threshold, 
    newPoint.x + threshold, 
    newPoint.y + threshold, 
    scratch
  )
  
  const newPointLayerId = getPointLayerId(newPoint)
  
  for (const p of candidates) {
    if (p.id === newPoint.id) continue // 跳过自身
    
    const pointLayerId = getPointLayerId(p)
    
    // 如果指定了排除图层，只检查该图层
    if (excludeLayerId && pointLayerId !== excludeLayerId) continue
    
    // 检查是否在同一图层
    if (pointLayerId === newPointLayerId) {
      const dx = p.x - newPoint.x, dy = p.y - newPoint.y
      if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
        return true
      }
    }
  }
  
  return false
}

/**
 * 返回 grid 中距离 (x,y) 最近且在阈值内的点，否则返回 undefined
 * @param {SpatialGrid} grid
 * @param {number} x
 * @param {number} y
 * @param {number} scale
 * @param {Array} scratch
 * @param {Array} visibleLayerNames - 可见图层名称列表，如果为空则检查所有图层
 */
export function getPointAt(grid, x, y, scale, scratch, visibleLayerNames = null) {
  const threshold = 15 / scale
  const overlapThreshold = 8 / scale // 不同图层重合阈值
  const candidates = grid.query(x - threshold, y - threshold, x + threshold, y + threshold, scratch)
  
  // 按距离分组：精确匹配和重合匹配
  const exactMatches = []
  const overlapMatches = []
  
  for (const p of candidates) {
    // 如果指定了可见图层列表，只检查可见图层中的点
    if (visibleLayerNames && visibleLayerNames.length > 0) {
      let pointInVisibleLayer = false
      // 检查layerIds（新格式）
      if (Array.isArray(p.layerIds) && p.layerIds.length > 0) {
        pointInVisibleLayer = p.layerIds.some(id => visibleLayerNames.includes(id))
      }
      // 检查layerId（旧格式）
      else if (p.layerId) {
        pointInVisibleLayer = visibleLayerNames.includes(p.layerId)
      }
      // 检查layername（兼容格式）
      else if (p.layername) {
        pointInVisibleLayer = visibleLayerNames.includes(p.layername)
      }
      // 默认在g图层
      else {
        pointInVisibleLayer = visibleLayerNames.includes('g')
      }
      if (!pointInVisibleLayer) continue
    }
    
    const dx = p.x - x, dy = p.y - y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance <= threshold) {
      exactMatches.push({ point: p, distance })
    } else if (distance <= overlapThreshold) {
      overlapMatches.push({ point: p, distance })
    }
  }
  
  // 优先返回精确匹配的点
  if (exactMatches.length > 0) {
    // 按距离排序，返回最近的点
    exactMatches.sort((a, b) => a.distance - b.distance)
    return exactMatches[0].point
  }
  
  // 如果没有精确匹配，返回重合匹配中最近的点
  if (overlapMatches.length > 0) {
    overlapMatches.sort((a, b) => a.distance - b.distance)
    return overlapMatches[0].point
  }
  
  return undefined
}

/**
 * 返回 grid 中距离 (x,y) 最近且在阈值内的文本，否则返回 undefined
 * @param {SpatialGrid} grid
 */
export function getTextAt(grid, x, y, scale, scratch) {
  const threshold = 20 / scale
  const candidates = grid.query(x - threshold, y - threshold, x + threshold, y + threshold, scratch)
  for (const t of candidates) {
    const dx = t.x - x, dy = t.y - y
    if (Math.sqrt(dx * dx + dy * dy) <= threshold) return t
  }
  return undefined
}

/**
 * 返回距离 (x,y) 最近且在阈值内的直线，否则返回 undefined
 * @param {SpatialGrid} lineGrid
 * @param {Function} getPointById  id => point
 */
export function getLineAt(lineGrid, getPointById, x, y, scale, scratch) {
  const threshold = 8 / scale
  const candidates = lineGrid.query(x - threshold, y - threshold, x + threshold, y + threshold, scratch)
  for (const line of candidates) {
    const sp = getPointById(line.startPointId)
    const ep = getPointById(line.endPointId)
    if (!sp || !ep) continue
    if (pointToSegmentDist(x, y, sp.x, sp.y, ep.x, ep.y) <= threshold) return line
  }
  return undefined
}

/**
 * 返回距离 (x,y) 最近且在阈值内的 B 样条，否则返回 undefined
 * @param {SpatialGrid} bsplineGrid
 * @param {Function} getPointById  id => point
 */
export function getBsplineAt(bsplineGrid, getPointById, x, y, scale, scratch) {
  const threshold = 8 / scale
  const candidates = bsplineGrid.query(x - threshold, y - threshold, x + threshold, y + threshold, scratch)

  for (const bspline of candidates) {
    const sp = getPointById(bspline.startPointId)
    const ep = getPointById(bspline.endPointId)
    if (!sp || !ep) continue

    const ctrlPts = bspline.controlPoints?.length
      ? bspline.controlPoints
      : (bspline.controlPointIds || []).map(id => getPointById(id)).filter(Boolean)

    // 快速端点检查
    const startDist = Math.hypot(x - sp.x, y - sp.y)
    const endDist = Math.hypot(x - ep.x, y - ep.y)
    if (startDist <= threshold || endDist <= threshold) return bspline

    // 采样检测
    const segments = 50 * Math.max(1, ctrlPts.length)
    for (let i = 0; i <= segments; i++) {
      const pt = calcCurvePoint(sp, ep, ctrlPts, i / segments)
      if (Math.hypot(x - pt.x, y - pt.y) <= threshold) return bspline
    }
  }
  return undefined
}

/**
 * 射线法判断点是否在多边形区域内
 * @param {Array} areas
 */
export function getAreaAt(areas, x, y) {
  for (const area of areas) {
    if (!area.points || area.points.length < 3) continue
    const pts = area.points
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y
      const xj = pts[j].x, yj = pts[j].y
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    if (inside) return area
  }
  return null
}
