/**
 * CanvasRenderer.js
 * 负责所有 Canvas 绘制操作，与 Vue 组件状态解耦。
 * DrawingCanvas 实例化此类并调用其方法，使组件自身只关注状态和生命周期。
 */

import { CoordinateUtils } from './coordinateUtils.js'
import { RenderUtils } from './renderUtils.js'
import { BSplineCalculator } from './BSplineCalculator.js'

export class CanvasRenderer {
  constructor() {
    // 网格 pattern 缓存
    this._gridPattern = null
    this._gridPatternSize = null
    // 文本宽度缓存
    this.textMetricsCache = new Map()
    // B样条计算器实例
    this.bsplineCalculator = new BSplineCalculator()
  }

  /** 在切换 ctx（如渲染到离屏 canvas）时调用 */
  setCtx(ctx) {
    this.ctx = ctx
  }

  /** canvas 尺寸变化或缩放变化时清理与尺寸相关的缓存 */
  invalidateGridPattern() {
    this._gridPattern = null
    this._gridPatternSize = null
  }

  /** 清理B样条缓存 */
  invalidateBsplineCache() {
    this.bsplineCalculator.clearCache()
  }

  // ─── 辅助 ──────────────────────────────────────────────────────────────

  _screenX(wx, scale, offsetX) { return wx * scale + offsetX }
  _screenY(wy, scale, offsetY) { return -wy * scale + offsetY }


  // ─── 网格 ──────────────────────────────────────────────────────────────

  drawGrid(canvas, scale, offset) {
    const ctx = this.ctx
    if (!ctx || !canvas) return

    ctx.fillStyle = '#27314A'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const base = 100, min = 50, max = 250
    let gridSize

    if (scale >= 1 && scale < 2) {
      gridSize = base - (base - min) * (scale - 1)
    } else if (scale >= 2) {
      const cycles = Math.floor(Math.log10(scale / 2) / Math.log10(2))
      const progress = (scale / Math.pow(2, cycles)) / 2
      gridSize = progress >= 0.5
        ? min + (max - min) * (progress - 0.5) * 2
        : max - (max - min) * progress * 2
    } else if (scale >= 0.5) {
      gridSize = base - (base - min) * (1 - scale * 2)
    } else {
      const cycles = Math.floor(Math.log10(0.5 / scale) / Math.log10(2))
      const progress = (scale * Math.pow(2, cycles)) / 0.5
      gridSize = progress >= 0.5
        ? min + (max - min) * (progress - 0.5) * 2
        : max - (max - min) * progress * 2
    }

    const sizeKey = Math.max(10, Math.round(gridSize))
    if (!this._gridPattern || this._gridPatternSize !== sizeKey) {
      const p = document.createElement('canvas')
      p.width = sizeKey; p.height = sizeKey
      const pctx = p.getContext('2d')
      pctx.strokeStyle = '#4A5568'; pctx.lineWidth = 1
      pctx.beginPath()
      pctx.moveTo(sizeKey - 0.5, 0); pctx.lineTo(sizeKey - 0.5, sizeKey)
      pctx.moveTo(0, sizeKey - 0.5); pctx.lineTo(sizeKey, sizeKey - 0.5)
      pctx.stroke()
      this._gridPattern = ctx.createPattern(p, 'repeat')
      this._gridPatternSize = sizeKey
    }

    const ox = offset?.x || 0
    const oy = offset?.y || 0
    ctx.save()
    ctx.translate(ox % sizeKey, oy % sizeKey)
    ctx.fillStyle = this._gridPattern
    ctx.fillRect(-sizeKey, -sizeKey, canvas.width + sizeKey * 2, canvas.height + sizeKey * 2)
    ctx.restore()
  }

  // ─── 区域 ──────────────────────────────────────────────────────────────

  drawAreas(areas, selectedAreas, scale, offset) {
    const ctx = this.ctx
    const selectedSet = new Set(selectedAreas)

    for (const area of areas) {
      if (!area.points || area.points.length < 3) continue
      const isSelected = selectedSet.has(area.id)
      ctx.save()
      ctx.fillStyle = area.color || '#ffffff'
      ctx.globalAlpha = (area.opacity || 50) / 100
      ctx.beginPath()
      area.points.forEach((p, i) => {
        const sx = p.x * scale + offset.x
        const sy = -p.y * scale + offset.y
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
      })
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = isSelected ? '#ffe66d' : (area.color || '#ffffff')
      ctx.lineWidth = isSelected ? 3 : 2
      ctx.stroke()
      ctx.restore()
    }
  }

  // ─── 直线 ──────────────────────────────────────────────────────────────

  drawLines(lines, getPointById, selectedLines, scale, offset, visibleRect) {
    const ctx = this.ctx
    const selectedSet = new Set(selectedLines)
    const margin = 20 / scale

    for (const line of lines) {
      const sp = getPointById(line.startPointId)
      const ep = getPointById(line.endPointId)
      if (!sp || !ep) continue

      if (visibleRect) {
        const bbox = {
          minX: Math.min(sp.x, ep.x) - margin, maxX: Math.max(sp.x, ep.x) + margin,
          minY: Math.min(sp.y, ep.y) - margin, maxY: Math.max(sp.y, ep.y) + margin
        }
        if (!rectIntersects(bbox, visibleRect)) continue
      }

      const ss = CoordinateUtils.worldToScreen(sp.x, sp.y, scale, offset)
      const es = CoordinateUtils.worldToScreen(ep.x, ep.y, scale, offset)
      const isSelected = selectedSet.has(line.id)
      const color = isSelected ? '#ffe66d' : '#B8C5D6'

      RenderUtils.drawLine(ctx, ss.x, ss.y, es.x, es.y, color, 2)
      if (line.mode === 'single') this._drawDirectionArrow(ss.x, ss.y, es.x, es.y, isSelected)
    }
  }

  // ─── 点 ────────────────────────────────────────────────────────────────

  drawPoints(points, selectedPoints, scale, offset, curveState, visibleRect) {
    const ctx = this.ctx
    const selectedSet = new Set(selectedPoints)
    const margin = 20 / scale
    const ctrlSet = curveState?.curveControlPoints?.length
      ? new Set(curveState.curveControlPoints.map(cp => cp.id))
      : null

    for (const point of points) {
      if (visibleRect) {
        if (
          point.x < visibleRect.minX - margin || point.x > visibleRect.maxX + margin ||
          point.y < visibleRect.minY - margin || point.y > visibleRect.maxY + margin
        ) continue
      }

      const sc = CoordinateUtils.worldToScreen(point.x, point.y, scale, offset)
      const isSelected = selectedSet.has(point.id)
      const state = {
        isStartPoint: curveState?.curveStartPoint,
        isEndPoint: curveState?.curveEndPoint,
        isControlPoint: ctrlSet && ctrlSet.has(point.id) ? { id: point.id } : null
      }

      const fillColor = RenderUtils.getPointColor(point, isSelected, state)
      const radius = RenderUtils.getPointRadius(point, isSelected, state)

      const isCurveSpecial =
        state.isStartPoint?.id === point.id ||
        state.isEndPoint?.id === point.id ||
        state.isControlPoint?.id === point.id

      if (!isCurveSpecial && RenderUtils.isSitePoint(point)) {
        const siteFill = RenderUtils.getSiteFillColor(point)
        const size = Math.max(6, radius * 2)
        RenderUtils.drawFilledRect(ctx, sc.x, sc.y, size, siteFill, isSelected ? '#ffe66d' : null)
      } else {
        RenderUtils.drawPoint(ctx, sc.x, sc.y, radius, fillColor)
      }
    }
  }

  // ─── 文本 ──────────────────────────────────────────────────────────────

  drawTexts(texts, selectedTexts, scale, offset, visibleRect) {
    const ctx = this.ctx
    // selectedTexts 已经是 CompatSet，直接使用 .has() 方法，避免冗余Set构建
    const margin = 50 / scale

    for (const text of texts) {
      if (visibleRect) {
        if (
          text.x < visibleRect.minX - margin || text.x > visibleRect.maxX + margin ||
          text.y < visibleRect.minY - margin || text.y > visibleRect.maxY + margin
        ) continue
      }

      const sc = CoordinateUtils.worldToScreen(text.x, text.y, scale, offset)
      const isSelected = selectedTexts.has(text.id)

      if (isSelected) {
        const fs = Math.max(text.fontSize * scale, 16)
        const cacheKey = `${text.name}_${fs}`
        let metrics = this.textMetricsCache.get(cacheKey)
        if (!metrics) {
          ctx.font = `${fs}px Arial`
          metrics = ctx.measureText(text.name)
          this.textMetricsCache.set(cacheKey, metrics)
        }
        const padding = 4
        ctx.fillStyle = 'rgba(255, 230, 109, 0.3)'
        ctx.fillRect(
          sc.x - metrics.width / 2 - padding,
          sc.y - fs / 2 - padding,
          metrics.width + padding * 2,
          fs + padding * 2
        )
      }

      RenderUtils.drawText(ctx, text.name, sc.x, sc.y, text.color || '#ffffff', Math.max(text.fontSize * scale, 16))
    }
  }

  // ─── B 样条 ────────────────────────────────────────────────────────────

  drawBsplines(bsplines, getPointById, selectedLines, scale, offset) {
    // selectedLines 已经是 CompatSet，直接使用 .has() 方法，避免includes()的O(n)查找
    for (const bspline of bsplines) {
      const sp = getPointById(bspline.startPointId)
      const ep = getPointById(bspline.endPointId)
      if (!sp || !ep) continue

      const ctrlPts = bspline.controlPoints?.length
        ? bspline.controlPoints
        : (bspline.controlPointIds || []).map(id => getPointById(id)).filter(Boolean)

      const isSelected = selectedLines.has(bspline.id) // 优化：从O(n)降到O(1)
      const color = isSelected ? '#ffe66d' : '#B8C5D6'

      this._drawBSplineWithEndpoints(sp, ep, ctrlPts, bspline.params || {}, color, 2, bspline.id, scale, offset)

      if (bspline.mode === 'single') {
        this._drawCurveDirectionArrow(sp, ep, ctrlPts, isSelected, bspline.id, scale, offset)
      }
    }
  }

  _getOrBuildWorldPoints(cacheKey, startPoint, endPoint, controlPoints, segments) {
    return this.bsplineCalculator.getOrBuildWorldPoints(
      cacheKey, startPoint, endPoint, controlPoints, segments
    )
  }

  _drawBSplineWithEndpoints(startPoint, endPoint, controlPoints, params, color, lineWidth, bsplineId, scale, offset) {
    const ctx = this.ctx
    const ox = offset?.x || 0
    const oy = offset?.y || 0

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.beginPath()

    const sx = startPoint.x * scale + ox
    const sy = -startPoint.y * scale + oy
    ctx.moveTo(sx, sy)

    if (controlPoints.length === 0) {
      ctx.lineTo(endPoint.x * scale + ox, -endPoint.y * scale + oy)
      ctx.stroke()
      return
    }

    // 智能segments策略：根据缩放级别和曲线复杂度动态调整
    const segments = this.calculateOptimalSegments(startPoint, endPoint, controlPoints, scale)
    const cacheKey = this.bsplineCalculator.generateCacheKey(
      bsplineId, startPoint, endPoint, controlPoints, { ...params, segments }
    )
    const worldPts = this._getOrBuildWorldPoints(
      cacheKey, startPoint, endPoint, controlPoints, segments
    )

    // 绘制曲线
    for (const p of worldPts) {
      ctx.lineTo(p.x * scale + ox, -p.y * scale + oy)
    }
    ctx.stroke()
  }

  /**
   * 计算最优segments数量 - 平衡质量和性能
   * @private
   */
  calculateOptimalSegments(startPoint, endPoint, controlPoints, scale) {
    // 激进优化：大幅减少基础segments，提升性能
    let baseSegments = 20 // 从50降到20
    
    // 根据缩放级别调整：更保守的缩放策略
    if (scale > 4) {
      baseSegments = 30 // 从100降到30
    } else if (scale > 8) {
      baseSegments = 40 // 从150降到40
    }
    
    // 根据曲线复杂度调整：更保守的复杂度策略
    const complexityFactor = Math.max(1, Math.min(controlPoints.length / 3, 2)) // 从/2降到/3，最大2降到2
    const adjustedSegments = Math.floor(baseSegments * complexityFactor)
    
    // 更严格的范围限制
    return Math.min(Math.max(adjustedSegments, 10), 60) // 最小10，最大60（从200降到60）
  }

  _drawDirectionArrow(x1, y1, x2, y2, isSelected) {
    const ctx = this.ctx
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    if (!len) return

    const ux = dx / len, uy = dy / len
    const mx = x1 + dx / 2, my = y1 + dy / 2
    const as = 10, aw = 7

    const tipX = mx + ux * as, tipY = my + uy * as
    const b1x = mx - ux * as / 2 - uy * aw / 2, b1y = my - uy * as / 2 + ux * aw / 2
    const b2x = mx - ux * as / 2 + uy * aw / 2, b2y = my - uy * as / 2 - ux * aw / 2

    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    ctx.lineTo(b1x, b1y)
    ctx.lineTo(b2x, b2y)
    ctx.closePath()
    ctx.strokeStyle = isSelected ? '#ffe66d' : '#B8C5D6'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  _drawCurveDirectionArrow(startPoint, endPoint, controlPoints, isSelected, bsplineId, scale, offset) {
    const ox = offset?.x || 0, oy = offset?.y || 0
    const segments = 50

    if (controlPoints.length === 0) {
      this._drawDirectionArrow(
        startPoint.x * scale + ox, -startPoint.y * scale + oy,
        endPoint.x * scale + ox, -endPoint.y * scale + oy,
        isSelected
      )
      return
    }

    const cacheKey = this.bsplineCalculator.generateCacheKey(
      bsplineId, startPoint, endPoint, controlPoints, { segments }
    )
    const worldPts = this._getOrBuildWorldPoints(
      cacheKey, startPoint, endPoint, controlPoints, segments
    )

    // 使用BSplineCalculator计算中点和方向
    const midpointInfo = this.bsplineCalculator.calculateCurveMidpoint(
      worldPts, scale, offset
    )

    if (!midpointInfo) return

    const { position, direction } = midpointInfo
    const arrowSize = 10, arrowWidth = 7

    // 计算箭头的三个点
    const tipX = position.x + direction.x * arrowSize
    const tipY = position.y + direction.y * arrowSize
    
    const base1X = position.x - direction.x * arrowSize/2 - direction.y * arrowWidth/2
    const base1Y = position.y - direction.y * arrowSize/2 + direction.x * arrowWidth/2
    
    const base2X = position.x - direction.x * arrowSize/2 + direction.y * arrowWidth/2
    const base2Y = position.y - direction.y * arrowSize/2 - direction.x * arrowWidth/2

    // 绘制空心三角形箭头
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    ctx.lineTo(base1X, base1Y)
    ctx.lineTo(base2X, base2Y)
    ctx.closePath()
    
    ctx.strokeStyle = isSelected ? '#ffe66d' : '#B8C5D6'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  drawControlPoints(controlPoints, scale, offset) {
    const ctx = this.ctx
    const ox = offset?.x || 0, oy = offset?.y || 0
    controlPoints.forEach((p, i) => {
      const x = p.x * scale + ox, y = -p.y * scale + oy
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#ffa500'; ctx.fill()
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = '#000000'; ctx.font = '10px Arial'
      ctx.fillText(i + 1, x + 8, y - 8)
    })
  }

  // ─── 选框预览 & 连线预览 ────────────────────────────────────────────────

  drawPreview(state, scale, offset) {
    const ctx = this.ctx
    const { currentTool, tempLineStart, mousePosition, curveStartPoint, curveEndPoint, curveControlPoints } = state
    const ox = offset?.x || 0, oy = offset?.y || 0

    if (currentTool === 'line' && tempLineStart) {
      ctx.strokeStyle = '#888888'; ctx.lineWidth = 1; ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(tempLineStart.x * scale + ox, -tempLineStart.y * scale + oy)
      ctx.lineTo(mousePosition.x, mousePosition.y)
      ctx.stroke(); ctx.setLineDash([])
    }

    if (curveStartPoint && (curveControlPoints.length > 0 || curveEndPoint)) {
      const ep = curveEndPoint || {
        x: (mousePosition.x - ox) / scale,
        y: -(mousePosition.y - oy) / scale
      }
      this._drawBSplineWithEndpoints(curveStartPoint, ep, curveControlPoints, {}, '#6495ed', 2, '__preview__', scale, offset)
      if (!curveEndPoint) this.drawControlPoints(curveControlPoints, scale, offset)
    }
  }

  drawSelection(state) {
    const ctx = this.ctx
    const { currentTool, selectionStart, selectionEnd } = state
    if (currentTool === null && selectionStart && selectionEnd) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([8, 4])
      ctx.strokeRect(
        selectionStart.x, selectionStart.y,
        selectionEnd.x - selectionStart.x,
        selectionEnd.y - selectionStart.y
      )
      ctx.setLineDash([])
    }
  }
}

// ─── 辅助 ──────────────────────────────────────────────────────────────────

function rectIntersects(a, b) {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY)
}
