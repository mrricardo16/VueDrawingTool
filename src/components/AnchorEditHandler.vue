<template>
  <!-- 纯逻辑组件，不渲染 DOM；通过 drawHandles() 绘制到 overlay canvas -->
  <div class="anchor-edit-handler" />
</template>

<script>
/**
 * AnchorEditHandler.vue
 *
 * 职责：
 *   1. 单选曲线（bspline）时，在 overlay canvas 上绘制控制点把手，
 *      并允许用户拖拽任意控制点来实时调整曲线形状。
 *   2. 单选区域（area）时，绘制四个顶点锚点，允许拖拽调整区域形状。
 *
 * 架构要点：
 *   - 在 DrawingCanvas template 中放在 MouseEventHandler 之前，
 *     确保 mousedown 监听器优先注册；命中把手时调用
 *     event.stopImmediatePropagation() 独占事件，不影响其他工具。
 *   - 仅在 currentTool === null（默认选择模式）时激活交互。
 *   - 所有拖拽状态存储在普通 JS 属性（非 Vue reactive），
 *     避免不必要的响应式追踪和 GC 压力。
 *   - 拖拽过程中不修改 props 传入的原始数据；持有本地副本，
 *     拖拽结束后通过 emit 触发统一的 handleUpdateCurve / handleUpdateArea。
 *   - drawHandles(ctx) 由 DrawingCanvas._drawOverlays() 调用，
 *     将把手和预览曲线渲染到独立 overlay canvas，不污染 base cache。
 */

import { CoordinateUtils } from '../utils/coordinateUtils.js'
import { BSplineCalculator } from '../utils/BSplineCalculator.js'
import {
  worldToScreen,
  collectAnchorHandles,
  hitTestAnchorHandle
} from '../composables/anchor/anchorHandleMath.js'

// ─── 常量 ───────────────────────────────────────────────────────────────────

/** 把手命中检测半径（屏幕像素） */
const HIT_RADIUS_PX = 10

/** B 样条控制点：视觉圆圈半径（屏幕像素） */
const BSPLINE_HANDLE_RADIUS = 6

/** 区域顶点：方块锚点半边长（屏幕像素） */
const AREA_HANDLE_HALF = 6

/** 预览曲线采样段数（拖拽时） */
const PREVIEW_SEGMENTS = 40

const HANDLE_TYPE = Object.freeze({
  BSPLINE_CP: 'bspline_cp',
  AREA_VERTEX: 'area_vertex',
})

// ─── 组件 ───────────────────────────────────────────────────────────────────

export default {
  name: 'AnchorEditHandler',

  props: {
    /** 宿主 canvas 元素（由 DrawingCanvas 传入） */
    canvas: { type: HTMLCanvasElement, default: null },

    /** 当前激活工具（null = 默认选择模式） */
    currentTool: { type: String, default: null },

    /** 当前缩放比例 */
    scale: { type: Number, default: 1 },

    /** 当前偏移量 */
    offset: { type: Object, default: () => ({ x: 0, y: 0 }) },

    /**
     * 当前处于编辑状态的 B 样条对象（单选时由 DrawingCanvas 计算）。
     * null 表示未进入 bspline 编辑模式。
     */
    activeBspline: { type: Object, default: null },

    /** activeBspline 的起点对象（从 points 数组中解析） */
    bsplineStartPoint: { type: Object, default: null },

    /** activeBspline 的终点对象（从 points 数组中解析） */
    bsplineEndPoint: { type: Object, default: null },

    /**
     * 当前处于编辑状态的区域对象（单选时由 DrawingCanvas 计算）。
     * null 表示未进入 area 编辑模式。
     */
    activeArea: { type: Object, default: null },
  },

  emits: [
    /**
     * 控制点拖拽结束：携带 { bsplineId, before } 供 DrawingCanvas 提交历史。
     * before 是 mousedown 时克隆的完整 bspline 快照；after 从 store 当前状态读取。
     * 拖拽过程中已就地修改了 bspline.controlPoints[i].x/y，无需再传 after。
     */
    'bspline-anchor-drag-end',

    /**
     * 区域顶点拖拽结束：携带 { areaId, before } 供 DrawingCanvas 提交历史。
     */
    'area-anchor-drag-end',

    /**
     * 拖拽过程中每帧触发，通知 DrawingCanvas 仅刷新 overlay canvas（把手/导引线）。
     */
    'request-redraw',

    /**
     * 拖拽过程中每帧触发，通知 DrawingCanvas 标脏 base cache 并重绘。
     * 原因：控制点坐标已就地修改，base canvas 里的曲线需要重新采样绘制。
     */
    'request-base-redraw',
  ],

  created() {
    // ── 非响应式拖拽状态（直接挂在实例上，不经过 Vue reactive） ─────────────
    this._canvasRect = null
    this._dragging = false
    this._dragHandleType = null  // HANDLE_TYPE.*
    this._dragHandleIndex = -1  // 被拖拽把手的索引

    // mousedown 时对原始对象的快照（用于 mouseup 时提交历史的 before 值）
    this._beforeSnapshot = null

    // 拖拽目标：直接引用 store 中的实际对象（不是副本），就地修改实现实时渲染
    // _dragControlPoints: activeBspline.controlPoints 中实际对象的引用数组
    // _dragAreaPoints:    activeArea.points 中实际对象的引用数组
    this._dragControlPoints = []
    this._dragAreaPoints = []

    // B 样条曲线采样器（用于实时预览，独立实例避免污染主渲染器缓存）
    this._bsplineCalc = new BSplineCalculator()

    // 绑定 this，避免每次创建匿名函数
    this._onMouseDown = this._handleMouseDown.bind(this)
    this._onMouseMove = this._handleMouseMove.bind(this)
    this._onMouseUp   = this._handleMouseUp.bind(this)
  },

  mounted() {
    if (this.canvas) {
      this._attachListeners(this.canvas)
    }
  },

  beforeUnmount() {
    if (this.canvas) {
      this._detachListeners(this.canvas)
    }
  },

  watch: {
    canvas(newCanvas, oldCanvas) {
      if (oldCanvas) this._detachListeners(oldCanvas)
      if (newCanvas) this._attachListeners(newCanvas)
    },
    // 激活元素切换时请求重绘，确保把手立即出现/消失
    activeBspline() { this.$emit('request-redraw') },
    activeArea()    { this.$emit('request-redraw') },
  },

  methods: {
    // ─── 监听器管理 ─────────────────────────────────────────────────────────

    _attachListeners(canvas) {
      // 不重复挂载
      this._detachListeners(canvas)
      canvas.addEventListener('mousedown', this._onMouseDown)
      canvas.addEventListener('mousemove', this._onMouseMove)
      document.addEventListener('mouseup', this._onMouseUp)
    },

    _detachListeners(canvas) {
      canvas.removeEventListener('mousedown', this._onMouseDown)
      canvas.removeEventListener('mousemove', this._onMouseMove)
      document.removeEventListener('mouseup', this._onMouseUp)
    },

    // ─── 坐标转换 ────────────────────────────────────────────────────────────

    /** mousedown 时刷新 BoundingClientRect，mousemove 复用缓存 */
    _refreshCanvasRect() {
      this._canvasRect = this.canvas ? this.canvas.getBoundingClientRect() : null
    },

    _getScreenXY(event) {
      return {
        sx: event.clientX - this._canvasRect.left,
        sy: event.clientY - this._canvasRect.top,
      }
    },

    /** 世界坐标 → 屏幕坐标 */
    _worldToScreen(wx, wy) {
      return worldToScreen(wx, wy, this.scale, this.offset)
    },

    // ─── 把手列表计算 ────────────────────────────────────────────────────────

    /**
     * 返回当前所有可交互把手的数组。
     * 拖拽过程中使用本地副本坐标（实时更新），
     * 静止状态下直接读取 prop 数据。
     *
     * @returns {Array<{type, index, sx, sy}>}
     */
    _getHandles() {
      return collectAnchorHandles({
        activeBspline: this.activeBspline,
        activeArea: this.activeArea,
        dragging: this._dragging,
        dragControlPoints: this._dragControlPoints,
        dragAreaPoints: this._dragAreaPoints,
        scale: this.scale,
        offset: this.offset,
        bsplineHandleType: HANDLE_TYPE.BSPLINE_CP,
        areaHandleType: HANDLE_TYPE.AREA_VERTEX
      })
    },

    /**
     * 命中检测：返回屏幕坐标 (sx, sy) 处的把手，未命中返回 null。
     * 使用距离平方比较，避免 sqrt 开销。
     */
    _hitTest(sx, sy) {
      return hitTestAnchorHandle(this._getHandles(), sx, sy, HIT_RADIUS_PX)
    },

    // ─── 鼠标事件处理 ────────────────────────────────────────────────────────

    _handleMouseDown(event) {
      // 只在默认选择模式（null）下允许把手拖拽
      if (this.currentTool !== null) return
      if (event.button !== 0) return
      if (!this.activeBspline && !this.activeArea) return

      this._refreshCanvasRect()
      if (!this._canvasRect) return

      const { sx, sy } = this._getScreenXY(event)
      const hit = this._hitTest(sx, sy)
      if (!hit) return

      // 独占此事件：阻止 MouseEventHandler 及之后监听器处理（框选/点击选中）
      event.stopImmediatePropagation()

      this._dragging = true
      this._dragHandleType = hit.type
      this._dragHandleIndex = hit.index

      if (hit.type === HANDLE_TYPE.BSPLINE_CP) {
        // 保存 before 快照（深拷贝，含 controlPoints），供 mouseup 写入历史
        this._beforeSnapshot = {
          ...this.activeBspline,
          controlPoints: (this.activeBspline.controlPoints || []).map(cp => ({ ...cp })),
        }
        // 直接引用 store 中的实际控制点对象——就地修改 = 实时渲染
        this._dragControlPoints = this.activeBspline.controlPoints || []
      } else if (hit.type === HANDLE_TYPE.AREA_VERTEX) {
        // 保存 before 快照
        this._beforeSnapshot = {
          ...this.activeArea,
          points: (this.activeArea.points || []).map(p => ({ ...p })),
        }
        // 直接引用 store 中的实际顶点对象
        this._dragAreaPoints = this.activeArea.points || []
      }
    },

    _handleMouseMove(event) {
      if (!this._dragging || !this._canvasRect) return

      const { sx, sy } = this._getScreenXY(event)
      const world = CoordinateUtils.screenToWorld(sx, sy, this.scale, this.offset)

      if (this._dragHandleType === HANDLE_TYPE.BSPLINE_CP) {
        const cp = this._dragControlPoints[this._dragHandleIndex]
        cp.x = world.x
        cp.y = world.y
      } else if (this._dragHandleType === HANDLE_TYPE.AREA_VERTEX) {
        const p = this._dragAreaPoints[this._dragHandleIndex]
        p.x = world.x
        p.y = world.y
      }

      // 通知 DrawingCanvas：
      // 1. 标脏 base cache + 重绘（曲线/区域坐标已变，需要重新采样渲染）
      // 2. 刷新 overlay（把手位置跟随鼠标）
      this.$emit('request-base-redraw')
      this.$emit('request-redraw')
    },

    _handleMouseUp(event) {
      if (!this._dragging) return

      // 阻止 MouseEventHandler 的 document mouseup 处理器触发（防止清除选中状态）
      event.stopImmediatePropagation()

      this._dragging = false

      // 提交历史：携带 mousedown 时保存的 before 快照；
      // after 由 DrawingCanvas 侧从 store 当前状态读取（就地修改已完成）。
      if (this._dragHandleType === HANDLE_TYPE.BSPLINE_CP && this.activeBspline) {
        this.$emit('bspline-anchor-drag-end', {
          bsplineId: this.activeBspline.id,
          before: this._beforeSnapshot,
        })
      } else if (this._dragHandleType === HANDLE_TYPE.AREA_VERTEX && this.activeArea) {
        this.$emit('area-anchor-drag-end', {
          areaId: this.activeArea.id,
          before: this._beforeSnapshot,
        })
      }

      // 清理
      this._dragHandleType = null
      this._dragHandleIndex = -1
      this._dragControlPoints = []
      this._dragAreaPoints = []
      this._beforeSnapshot = null

      this.$emit('request-redraw')
    },

    // ─── 渲染（由 DrawingCanvas._drawOverlays 调用） ──────────────────────────

    /**
     * 将把手和实时预览绘制到 overlay canvas ctx。
     *
     * 注意：此方法由 DrawingCanvas._drawOverlays() 在 RAF 回调中调用，
     * 因此无需手动 requestAnimationFrame。
     *
     * @param {CanvasRenderingContext2D} ctx - overlay canvas 的 2D context
     */
    drawHandles(ctx) {
      if (!ctx) return

      if (this.activeBspline) {
        this._drawBsplineHandles(ctx)
      }

      if (this.activeArea) {
        this._drawAreaHandles(ctx)
      }
    },

    // ─── 内部渲染方法 ────────────────────────────────────────────────────────

    _drawBsplineHandles(ctx) {
      const cps = this._dragging
        ? this._dragControlPoints
        : (this.activeBspline.controlPoints || [])

      // 没有控制点则无需绘制（直线 bspline）
      if (cps.length === 0) return

      const startPt = this.bsplineStartPoint
      const endPt   = this.bsplineEndPoint
      if (!startPt || !endPt) return

      const s = this.scale, ox = this.offset.x, oy = this.offset.y

      // ── 拖拽实时预览：虚线预览曲线 ────────────────────────────────────
      if (this._dragging) {
        this._drawBsplinePreviewCurve(ctx, startPt, endPt, cps, s, ox, oy)
      }

      // ── 导引线：起/终点 ↔ 首/尾控制点，以及控制点连线 ────────────────
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.45)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])

      const startSc = { x: startPt.x * s + ox, y: -startPt.y * s + oy }
      const endSc   = { x: endPt.x * s + ox,   y: -endPt.y * s + oy }
      const firstSc = { x: cps[0].x * s + ox,  y: -cps[0].y * s + oy }
      const lastSc  = { x: cps[cps.length - 1].x * s + ox, y: -cps[cps.length - 1].y * s + oy }

      // 起点 → 第 1 控制点
      ctx.beginPath()
      ctx.moveTo(startSc.x, startSc.y)
      ctx.lineTo(firstSc.x, firstSc.y)
      ctx.stroke()

      // 终点 → 最后一个控制点
      ctx.beginPath()
      ctx.moveTo(endSc.x, endSc.y)
      ctx.lineTo(lastSc.x, lastSc.y)
      ctx.stroke()

      // 控制点之间连线（多于 1 个时）
      if (cps.length > 1) {
        ctx.beginPath()
        for (let i = 0; i < cps.length; i++) {
          const px = cps[i].x * s + ox
          const py = -cps[i].y * s + oy
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      ctx.setLineDash([])
      ctx.restore()

      // ── 控制点圆形把手 ──────────────────────────────────────────────────
      for (let i = 0; i < cps.length; i++) {
        const px = cps[i].x * s + ox
        const py = -cps[i].y * s + oy
        const isActive = (
          this._dragging &&
          this._dragHandleType === HANDLE_TYPE.BSPLINE_CP &&
          this._dragHandleIndex === i
        )
        const r = isActive ? BSPLINE_HANDLE_RADIUS + 2 : BSPLINE_HANDLE_RADIUS

        ctx.save()
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fillStyle   = isActive ? '#ffffff' : '#ffa500'
        ctx.strokeStyle = isActive ? '#ffa500' : '#1a202c'
        ctx.lineWidth   = 1.5
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        // 序号标签
        ctx.save()
        ctx.font         = `bold ${Math.max(9, Math.min(12, r + 4))}px Arial`
        ctx.fillStyle    = isActive ? '#1a202c' : '#1a202c'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(i + 1), px, py)
        ctx.restore()
      }
    },

    /**
     * 拖拽过程中绘制虚线预览曲线（替代 base cache 中的固体曲线做对比）。
     * 使用独立 BSplineCalculator 实例，直接生成（不缓存），
     * 避免污染主渲染器的 bspline 几何缓存。
     */
    _drawBsplinePreviewCurve(ctx, startPt, endPt, controlPoints, s, ox, oy) {
      const pts = this._bsplineCalc.generateWorldPointsNow(
        startPt, endPt, controlPoints, PREVIEW_SEGMENTS
      )
      if (!pts || pts.length === 0) return

      ctx.save()
      ctx.strokeStyle = 'rgba(255, 230, 109, 0.7)'
      ctx.lineWidth   = 2
      ctx.setLineDash([6, 4])

      ctx.beginPath()
      ctx.moveTo(startPt.x * s + ox, -startPt.y * s + oy)
      for (const p of pts) {
        ctx.lineTo(p.x * s + ox, -p.y * s + oy)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    },

    _drawAreaHandles(ctx) {
      const pts = this._dragging
        ? this._dragAreaPoints
        : (this.activeArea.points || [])

      if (pts.length === 0) return

      const s = this.scale, ox = this.offset.x, oy = this.offset.y

      // ── 区域轮廓高亮（虚线）──────────────────────────────────────────
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 230, 109, 0.55)'
      ctx.lineWidth   = 1.5
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      for (let i = 0; i < pts.length; i++) {
        const px = pts[i].x * s + ox
        const py = -pts[i].y * s + oy
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // ── 顶点方块锚点 ────────────────────────────────────────────────
      for (let i = 0; i < pts.length; i++) {
        const px = pts[i].x * s + ox
        const py = -pts[i].y * s + oy
        const isActive = (
          this._dragging &&
          this._dragHandleType === HANDLE_TYPE.AREA_VERTEX &&
          this._dragHandleIndex === i
        )
        const hs = isActive ? AREA_HANDLE_HALF + 2 : AREA_HANDLE_HALF

        ctx.save()
        ctx.fillStyle   = isActive ? '#ffffff' : '#ffe66d'
        ctx.strokeStyle = isActive ? '#ffe66d' : '#1a202c'
        ctx.lineWidth   = 1.5
        ctx.fillRect(px - hs, py - hs, hs * 2, hs * 2)
        ctx.strokeRect(px - hs, py - hs, hs * 2, hs * 2)
        ctx.restore()

        // 顶点序号
        ctx.save()
        ctx.font         = 'bold 10px Arial'
        ctx.fillStyle    = '#1a202c'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(i + 1), px, py)
        ctx.restore()
      }
    },
  },
}
</script>

<style scoped>
.anchor-edit-handler {
  display: none;
}
</style>
