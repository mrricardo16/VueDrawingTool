/**
 * 锚点编辑数学辅助：坐标转换、把手收集、命中检测。
 */
export function worldToScreen(wx, wy, scale, offset) {
  return {
    x: wx * scale + offset.x,
    y: -wy * scale + offset.y
  }
}

export function collectAnchorHandles({
  activeBspline,
  activeArea,
  dragging,
  dragControlPoints,
  dragAreaPoints,
  getPointById,
  scale,
  offset,
  bsplineHandleType,
  areaHandleType
}) {
  const handles = []

  if (activeBspline) {
    const cps = dragging
      ? dragControlPoints
      : (activeBspline.controlPoints?.length
        ? activeBspline.controlPoints
        : (activeBspline.controlPointIds || [])
          .map(id => (typeof getPointById === 'function' ? getPointById(id) : null))
          .filter(Boolean))
    for (let i = 0; i < cps.length; i++) {
      const sc = worldToScreen(cps[i].x, cps[i].y, scale, offset)
      handles.push({ type: bsplineHandleType, index: i, sx: sc.x, sy: sc.y })
    }
  }

  if (activeArea) {
    const pts = dragging ? dragAreaPoints : (activeArea.points || [])
    for (let i = 0; i < pts.length; i++) {
      const sc = worldToScreen(pts[i].x, pts[i].y, scale, offset)
      handles.push({ type: areaHandleType, index: i, sx: sc.x, sy: sc.y })
    }
  }

  return handles
}

export function hitTestAnchorHandle(handles, sx, sy, hitRadiusPx) {
  const r2 = hitRadiusPx * hitRadiusPx
  for (const h of handles) {
    const dx = sx - h.sx
    const dy = sy - h.sy
    if (dx * dx + dy * dy <= r2) return h
  }
  return null
}
