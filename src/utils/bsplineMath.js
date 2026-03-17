/**
 * bsplineMath.js
 * 纯 B 样条数学函数库，无副作用，可在 DrawingCanvas 和 MouseEventHandler 中共享。
 * 原先这些函数在两个组件中各自复制了一份，现统一到这里。
 */

/**
 * 在节点向量中查找 u 所在的区间下标（de Boor 算法辅助）
 */
export function findSpan(n, degree, u, knots) {
  if (u >= knots[n + 1]) return n
  if (u <= knots[degree]) return degree

  let low = degree
  let high = n + 1
  let mid = Math.floor((low + high) / 2)

  while (u < knots[mid] || u >= knots[mid + 1]) {
    if (u < knots[mid]) {
      high = mid
    } else {
      low = mid
    }
    mid = Math.floor((low + high) / 2)
  }

  return mid
}

/**
 * 计算 B 样条基函数（Cox-de Boor 递推）
 * 返回长度为 degree+1 的数组（复用传入的 buffers 可避免 GC）
 */
export function basisFunctions(span, u, degree, knots, bufN, bufLeft, bufRight) {
  const N = bufN || new Array(degree + 1).fill(0)
  const left = bufLeft || new Array(degree + 1)
  const right = bufRight || new Array(degree + 1)
  for (let i = 0; i <= degree; i++) N[i] = 0

  N[0] = 1.0

  for (let j = 1; j <= degree; j++) {
    left[j] = u - knots[span + 1 - j]
    right[j] = knots[span + j] - u

    let saved = 0.0
    for (let r = 0; r < j; r++) {
      const temp = N[r] / (right[r + 1] + left[j - r])
      N[r] = saved + right[r + 1] * temp
      saved = left[j - r] * temp
    }
    N[j] = saved
  }

  return N
}

/**
 * 计算均匀 B 样条上参数 u 对应的点
 * @param {Array} controlPoints - 含 {x,y} 的控制点数组
 * @param {Array} knots         - 节点向量
 * @param {number} degree       - 阶数（通常为 3）
 * @param {number} u            - 参数值
 * @param {{N,left,right}} bufs - 可选的复用缓冲，避免每帧分配
 */
export function calcBSplinePoint(controlPoints, knots, degree, u, bufs) {
  const n = controlPoints.length - 1
  const span = findSpan(n, degree, u, knots)
  const basis = basisFunctions(
    span, u, degree, knots,
    bufs?.N, bufs?.left, bufs?.right
  )

  let x = 0, y = 0
  for (let i = 0; i <= degree; i++) {
    const cp = controlPoints[span - degree + i]
    if (cp && typeof cp.x !== 'undefined') {
      x += basis[i] * cp.x
      y += basis[i] * cp.y
    }
  }
  return { x, y }
}

/**
 * 构建均匀夹端节点向量（开放 B 样条）
 */
export function buildOpenKnots(n, degree) {
  const knots = []
  for (let i = 0; i <= n + degree + 1; i++) {
    if (i <= degree) knots.push(0)
    else if (i >= n + 1) knots.push(n - degree + 1)
    else knots.push(i - degree)
  }
  return knots
}

/**
 * 二次贝塞尔点
 */
export function calcQuadraticBezier(p0, p1, p2, t) {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  }
}

/**
 * 通用入口：根据起点、终点、控制点数组和参数 t∈[0,1] 计算曲线上的点。
 * - 无控制点 → 线性插值
 * - 1 个控制点 → 二次贝塞尔
 * - 多个控制点 → 夹端均匀 B 样条
 */
export function calcCurvePoint(startPoint, endPoint, controlPoints, t, bufs) {
  if (controlPoints.length === 0) {
    return {
      x: startPoint.x + (endPoint.x - startPoint.x) * t,
      y: startPoint.y + (endPoint.y - startPoint.y) * t
    }
  }

  if (controlPoints.length === 1) {
    return calcQuadraticBezier(startPoint, controlPoints[0], endPoint, t)
  }

  const allPoints = [startPoint, ...controlPoints, endPoint]
  const degree = 3
  const n = allPoints.length - 1
  const knots = buildOpenKnots(n, degree)

  if (t <= 0) return { ...startPoint }
  if (t >= 1) return { ...endPoint }

  const u = t * (n - degree + 1)
  return calcBSplinePoint(allPoints, knots, degree, u, bufs)
}

/**
 * 将曲线采样为世界坐标点数组（供渲染和碰撞检测复用）
 * @param {number} segments - 采样段数
 * @returns {Array<{x,y}>}
 */
export function sampleCurve(startPoint, endPoint, controlPoints, segments, bufs) {
  const points = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    points.push(calcCurvePoint(startPoint, endPoint, controlPoints, t, bufs))
  }
  return points
}
