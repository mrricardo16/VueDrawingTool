<template>
  <div class="canvas-container">
    <canvas ref="canvas"></canvas>
    <!--
      叠加层画布：专用于选框/预览线，pointer-events:none 鼠标事件穿透底层。
      叠加层独立刷新，选框拖动时不触发 renderBaseCache，彻底消除全图重绘卡顿。
    -->
    <canvas ref="overlayCanvas" class="overlay-canvas"></canvas>

    <!-- 把手编辑器（必须在 MouseEventHandler 之前注册，以获得事件优先权） -->
    <AnchorEditHandler
      ref="anchorEditHandler"
      v-bind="anchorEditProps"
      v-on="anchorEditListeners"
    />

    <!-- 鼠标事件处理 -->
    <MouseEventHandler
      ref="mouseEventHandler"
      v-bind="mouseEventProps"
      v-on="mouseEventListeners"
    />

    <!-- 移动模式处理器 -->
    <MoveModeHandler
      v-bind="moveModeProps"
      v-on="moveModeListeners"
    />

    <!-- 区域处理器 -->
    <AreaHandler
      v-bind="areaHandlerProps"
      v-on="areaHandlerListeners"
    />
  </div>
</template>

<script>
import AnchorEditHandler from './AnchorEditHandler.vue'
import MouseEventHandler from './MouseEventHandler.vue'
import MoveModeHandler from './MoveModeHandler.vue'
import AreaHandler from './AreaHandler.vue'
import { CanvasRenderer } from '../utils/CanvasRenderer.js'
import { EventUtils } from '../utils/eventUtils.js'
import { createDrawingCanvasChildListeners } from '../composables/canvas/useDrawingCanvasChildListeners.js'
import { createCanvasCacheDirtyManager } from '../composables/canvas/useCanvasCacheDirtyManager.js'
import { createDrawingCanvasRenderState } from '../composables/canvas/useDrawingCanvasRenderState.js'
import { applyCanvasStateUpdate } from '../composables/canvas/useCanvasStateBridge.js'
import { fitCanvasToPoints, resizeCanvasToContainer } from '../composables/canvas/useCanvasViewState.js'
import { handleElementsUpdatedMutation, notifyPointsMutatedMutation, handleAnchorBaseRedrawMutation, handleDragUpdateMutation, handleDragStartMutation } from '../composables/canvas/useCanvasMutationOps.js'
import { resolveActiveBsplineForEdit, resolveActiveBsplineStartPoint, resolveActiveBsplineEndPoint, resolveActiveAreaForEdit } from '../composables/canvas/useCanvasActiveEditors.js'
import { useLayerStore } from '../stores/layerStore.js'
import { storeToRefs } from 'pinia'

export default {
  name: 'DrawingCanvas',
  components: { AnchorEditHandler, MouseEventHandler, MoveModeHandler, AreaHandler },
  props: {
    currentTool: { type: String, default: null },
    points: { type: Array, default: () => [] },
    lines: { type: Array, default: () => [] },
    bsplines: { type: Array, default: () => [] },
    texts: { type: Array, default: () => [] },
    areas: { type: Array, default: () => [] },
    selectedPoints: { type: Array, default: () => [] },
    selectedLines: { type: Array, default: () => [] },
    selectedTexts: { type: Array, default: () => [] },
    selectedAreas: { type: Array, default: () => [] },
    bsplineParams: { type: Object, default: () => ({}) },
    selectionMode: { type: String, default: 'single' },
    lineReverseEnabled: { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false }
  },
  emits: [
    'point-added', 'point-selected', 'point-updated',
    'line-selected', 'line-created', 'bspline-created',
    'selection-changed',
    'text-added', 'text-selected', 'text-updated',
    'area-created', 'area-selected',
    'bspline-anchor-drag-end', 'area-anchor-drag-end',
    'points-deleted', 'clear-mode', 'undo', 'show-context-menu',
    'move-completed',
    'drag-start'
  ],
  data() {
    return {
      canvas: null,
      ctx: null,
      scale: 1,
      minScale: 0.001,
      maxScale: 50,
      offset: { x: 0, y: 0 },
      interaction: { panning: false },

      // 离屏缓存（base：静态场景；pan：平移快速模式）
      panCacheCanvas: null,
      panCacheCtx: null,
      panCacheBaseOffset: null,
      panCacheValid: false,
      baseCacheCanvas: null,
      baseCacheCtx: null,
      baseCacheValid: false,
      baseCacheDirty: true,

      isShiftPressed: false,
      selectionStart: null,
      selectionEnd: null,
      wasSelection: false,
      curveStartPoint: null,
      curveEndPoint: null,
      curveControlPoints: [],
      mousePosition: { x: 0, y: 0 },
      tempLineStart: null,

      // 叠加层 canvas（选框/预览线），与底层 baseCacheCanvas 完全隔离
      overlayCanvas: null,
      overlayCtx: null,

      // 选中 ID CompatSet 缓存（O(1) 查找，避免 renderBaseCache 中 O(n×m) includes）
      _selSetsDirty: true,
      _selSets: null,

      // 杂项
      pointByIdCache: null,
      isDragging: false,

      // CanvasRenderer 实例（负责所有绘制逻辑）
      renderer: null,

      // 子组件事件监听映射
      anchorEditListeners: {},
      mouseEventListeners: {},
      moveModeListeners: {},
      areaHandlerListeners: {}
    }
  },
  created() {
    this.scheduleRedraw = EventUtils.rafThrottle(() => this.redraw())
    this.debouncedResize = EventUtils.debounce(() => this.resizeCanvas(), 200)
    
    // 初始化图层store
    this.layerStore = useLayerStore()
    const { visibleLayerIds } = storeToRefs(this.layerStore)
    this.visibleLayerIds = visibleLayerIds
    this.cacheDirtyManager = createCanvasCacheDirtyManager(this)
    this.renderStateManager = createDrawingCanvasRenderState(this)

    const listeners = createDrawingCanvasChildListeners({
      emit: this.$emit.bind(this),
      handleCanvasStateUpdate: this.handleCanvasStateUpdate,
      handleElementsUpdated: this.handleElementsUpdated,
      handleDragStart: this.handleDragStart,
      handleDragUpdate: this.handleDragUpdate,
      redraw: this.redraw,
      handleBsplineAnchorDragEnd: this.handleBsplineAnchorDragEnd,
      handleAreaAnchorDragEnd: this.handleAreaAnchorDragEnd,
      handleAnchorBaseRedraw: this.handleAnchorBaseRedraw,
      drawOverlays: this._drawOverlays,
      onDragEnd: () => { this.isDragging = false }
    })
    this.anchorEditListeners = listeners.anchorEditListeners
    this.mouseEventListeners = listeners.mouseEventListeners
    this.moveModeListeners = listeners.moveModeListeners
    this.areaHandlerListeners = listeners.areaHandlerListeners
  },
  mounted() {
    this.canvas = this.$refs.canvas
    this.ctx = this.canvas.getContext('2d')
    this.overlayCanvas = this.$refs.overlayCanvas
    this.overlayCtx = this.overlayCanvas ? this.overlayCanvas.getContext('2d') : null
    this.renderer = new CanvasRenderer()
    this.renderer.setCtx(this.ctx)
    this.ensurePanCache()
    this.$nextTick(() => this.resizeCanvas())
    window.addEventListener('resize', this.debouncedResize)
    this.redraw()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.debouncedResize)
  },
  watch: {
    isLoading(next, prev) {
      this.cacheDirtyManager.onLoadingFinished(prev, next)
    },
    // ── 数组长度变化 (push/splice，同引用) ────────────────────────────────
    'points.length'()  { this.cacheDirtyManager.onCollectionLengthChanged({ invalidatePointById: true }) },
    'lines.length'()   { this.cacheDirtyManager.onCollectionLengthChanged() },
    'bsplines.length'(){ this.cacheDirtyManager.onCollectionLengthChanged() },
    'texts.length'()   { this.cacheDirtyManager.onCollectionLengthChanged() },
    'areas.length'()   { this.cacheDirtyManager.onCollectionLengthChanged() },

    // ── 数组引用替换 (undo/redo 后 value = newArray，长度可能相同) ─────────
    // 当 undo 还原了位置但长度未变时，仅靠 'X.length' watcher 无法触发重绘。
    // 此处通过对比引用（newArr !== oldArr）检测到 undo/redo 的新数组赋值。
    // ── undo/redo 后数组引用被替换（newArr !== oldArr）─────────────────────
    // 1. 标脏并触发重绘（坐标/内容已恢复到快照值）
    // 2. 调用 rebuildSpatialGrids：points 网格必须用新坐标重建，
    //    否则 undo 移动后点击命中仍用移动后的旧网格，出现命中偏移。
    points(newArr, oldArr) {
      if (newArr !== oldArr) {
        this.cacheDirtyManager.onCollectionReplaced({
          invalidatePointById: true,
          mouseGridMode: 'rebuild'
        })
      }
    },
    lines(newArr, oldArr)   { if (newArr !== oldArr) this.cacheDirtyManager.onCollectionReplaced({ mouseGridMode: 'line-dirty' }) },
    bsplines(newArr, oldArr){ if (newArr !== oldArr) this.cacheDirtyManager.onCollectionReplaced({ mouseGridMode: 'bspline-dirty' }) },
    texts(newArr, oldArr)   { if (newArr !== oldArr) this.cacheDirtyManager.onCollectionReplaced({ mouseGridMode: 'rebuild' }) },
    areas(newArr, oldArr)   { if (newArr !== oldArr) this.cacheDirtyManager.onCollectionReplaced() },
    selectedPoints() { this.cacheDirtyManager.onSelectionChanged() },
    selectedLines()  { this.cacheDirtyManager.onSelectionChanged() },
    selectedTexts()  { this.cacheDirtyManager.onSelectionChanged() },
    selectedAreas()  { this.cacheDirtyManager.onSelectionChanged() },
    currentTool() { this.redraw() },
    scale() { this.cacheDirtyManager.onViewChanged() },
    offset() { this.cacheDirtyManager.onViewChanged() },
    // 监听图层可见性变化
    visibleLayerIds() { this.cacheDirtyManager.onViewChanged() }
  },
  computed: {
    anchorEditProps() {
      return {
        canvas: this.canvas,
        currentTool: this.currentTool,
        scale: this.scale,
        offset: this.offset,
        activeBspline: this.activeBsplineForEdit,
        bsplineStartPoint: this.activeBsplineStartPoint,
        bsplineEndPoint: this.activeBsplineEndPoint,
        activeArea: this.activeAreaForEdit,
        getPointById: this.getPointByIdFn()
      }
    },

    mouseEventProps() {
      return {
        canvas: this.canvas,
        isLoading: this.isLoading,
        currentTool: this.currentTool,
        points: this.points,
        lines: this.lines,
        bsplines: this.bsplines,
        texts: this.texts,
        areas: this.areas,
        selectedPoints: this.selectedPoints,
        selectedLines: this.selectedLines,
        selectedTexts: this.selectedTexts,
        selectedAreas: this.selectedAreas,
        selectionMode: this.selectionMode,
        lineReverseEnabled: this.lineReverseEnabled,
        scale: this.scale,
        minScale: this.minScale,
        maxScale: this.maxScale,
        offset: this.offset,
        bsplineParams: this.bsplineParams
      }
    },

    moveModeProps() {
      return {
        canvas: this.canvas,
        currentTool: this.currentTool,
        points: this.points,
        lines: this.lines,
        bsplines: this.bsplines,
        texts: this.texts,
        selectedPoints: this.selectedPoints,
        selectedLines: this.selectedLines,
        selectedTexts: this.selectedTexts,
        areas: this.areas,
        selectedAreas: this.selectedAreas,
        scale: this.scale,
        offset: this.offset
      }
    },

    areaHandlerProps() {
      return {
        canvas: this.canvas,
        currentTool: this.currentTool,
        scale: this.scale,
        offset: this.offset
      }
    },

    /**
     * 当前处于控制点编辑模式的 B 样条对象。
     * 条件：恰好单选一条曲线（selectedLines 中的 ID 能在 bsplines 中找到）。
     * 仅在 currentTool === null 时激活，避免与移动等工具冲突。
     */
    activeBsplineForEdit() {
      return resolveActiveBsplineForEdit({
        selectedLines: this.selectedLines,
        bsplines: this.bsplines
      })
    },

    /**
     * activeBsplineForEdit 的起点 Point 对象（从 points 数组中解析）。
     * 作为独立 computed，避免在 activeBsplineForEdit 中引入 this.points 依赖
     * 导致不必要的重计算。
     */
    activeBsplineStartPoint() {
      return resolveActiveBsplineStartPoint({
        activeBsplineForEdit: this.activeBsplineForEdit,
        points: this.points
      })
    },

    /** activeBsplineForEdit 的终点 Point 对象 */
    activeBsplineEndPoint() {
      return resolveActiveBsplineEndPoint({
        activeBsplineForEdit: this.activeBsplineForEdit,
        points: this.points
      })
    },

    /**
     * 当前处于顶点编辑模式的区域对象。
     * 条件：恰好单选一个区域（selectedAreas.length === 1）。
     */
    activeAreaForEdit() {
      return resolveActiveAreaForEdit({
        selectedAreas: this.selectedAreas,
        areas: this.areas
      })
    },
  },

  methods: {
    // ─── 缓存管理 ────────────────────────────────────────────────────────

    ensureBaseCache() {
      this.renderStateManager.ensureBaseCache()
    },

    /**
     * 创建兼容 Set：同时支持 .has()（O(1)）和 .includes()（向后兼容 CanvasRenderer 旧调用），
     * 解决渲染器使用 Array.includes() 时 O(n×m) 选中判断瓶颈。
     */
    _makeCompatSet(arr) {
      const s = new Set(arr)
      s.includes = v => s.has(v)
      return s
    },

    renderBaseCache() {
      this.renderStateManager.renderBaseCache()
    },

    ensurePanCache() {
      this.renderStateManager.ensurePanCache()
    },

    beginPanFastMode() {
      this.renderStateManager.beginPanFastMode()
    },

    endPanFastMode() {
      this.renderStateManager.endPanFastMode()
    },

    // ─── 坐标工具 ────────────────────────────────────────────────────────

    getPointByIdFn() {
      if (!this.pointByIdCache) {
        this.pointByIdCache = new Map(this.points.map(p => [p.id, p]))
      }
      return id => this.pointByIdCache.get(id)
    },

    getVisibleWorldRect() {
      if (!this.canvas) return null
      const w = this.canvas.width, h = this.canvas.height
      const ox = this.offset?.x || 0, oy = this.offset?.y || 0
      const x1 = (0 - ox) / this.scale, x2 = (w - ox) / this.scale
      const y1 = -((0 - oy) / this.scale), y2 = -((h - oy) / this.scale)
      return { minX: Math.min(x1, x2), maxX: Math.max(x1, x2), minY: Math.min(y1, y2), maxY: Math.max(y1, y2) }
    },

    // ─── 主绘制 ──────────────────────────────────────────────────────────

    redraw() {
      this.renderStateManager.redraw()
    },

    /** 将选框/预览线绘制到独立 overlayCanvas，不触碰底层 baseCacheCanvas */
    _drawOverlays() {
      this.renderStateManager.drawOverlays()
    },

    // ─── 视图适配 ────────────────────────────────────────────────────────

    fitToView() {
      fitCanvasToPoints(this)
    },

    resizeCanvas() {
      resizeCanvasToContainer(this)
    },

    // ─── 来自子组件的事件处理 ────────────────────────────────────────────

    handleCanvasStateUpdate(state) {
      applyCanvasStateUpdate(this, state)
    },

    handleElementsUpdated(/* updatedElements */) {
      // App.vue 对 point-updated/text-updated 的处理均为 () => {}（无操作）。
      // 坐标已由 MoveModeHandler 就地修改（in-place），无需逐点发射 Vue 事件。
      // 若将来 App.vue 需要响应，可改为单次批量事件，而非 N 次独立 $emit。
      handleElementsUpdatedMutation(this)
    },

    /**
     * 拖拽开始时调用（来自 MoveModeHandler @drag-start）。
     */
    handleDragStart(payload) {
      handleDragStartMutation(this, payload)
    },

    /**
     * 外部调用入口：点坐标被就地修改后（如 performAlignment、handleUpdatePoint），
     * 通知画布和空间网格更新。
     * 原因：in-place 坐标修改不触发 Vue 的数组引用 watcher，
     *       必须手动标脏并重建空间网格，否则命中检测仍用旧坐标。
     */
    notifyPointsMutated() {
      notifyPointsMutatedMutation(this)
    },

    /**
     * AnchorEditHandler 拖拽控制点/顶点时每帧调用：
     * 坐标已就地修改，需要使 base cache 失效并重绘曲线/区域。
     * 同时清除 BSpline 几何缓存，确保下一帧重新采样。
     */
    handleAnchorBaseRedraw() {
      handleAnchorBaseRedrawMutation(this)
    },

    /**
     * 控制点拖拽结束：转发给 App.vue，由 App.vue 调用 store 写入历史。
     * payload: { bsplineId, before }
     */
    handleBsplineAnchorDragEnd(payload) {
      this.$emit('bspline-anchor-drag-end', payload)
    },

    /**
     * 区域顶点拖拽结束：转发给 App.vue。
     * payload: { areaId, before }
     */
    handleAreaAnchorDragEnd(payload) {
      this.$emit('area-anchor-drag-end', payload)
    },

    handleDragUpdate() {
      // 点坐标已被 MoveModeHandler 就地修改（in-place mutation），
      // 须同时清除 pointByIdCache（旧 Map 中的 {x,y} 仍指向已改变的对象，
      // 但 Map 本身对调用者透明；清除缓存确保 renderBaseCache 用最新坐标）
      // scheduleRedraw 内部使用 RAF，已保证同帧内多次调用只触发一次 redraw
      handleDragUpdateMutation(this)
    }
  }
}
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  flex: 1;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 鼠标事件穿透至底层 canvas */
}
</style>
