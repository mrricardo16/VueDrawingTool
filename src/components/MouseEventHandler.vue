<template>
  <div class="mouse-event-handler">
    <!-- 只处理鼠标事件，不渲染任何内容 -->
  </div>
</template>

<script>
/**
 * MouseEventHandler.vue（重构版）
 *
 * 职责聚焦于：事件监听绑定、工具状态机调度、向父组件发送事件。
 * 空间查询 → SpatialGrid
 * 碰撞检测 → hitTesting
 * B 样条数学 → bsplineMath（已在 hitTesting 内部使用，此处无需直接引用）
 */
import { EventUtils } from '../utils/eventUtils.js'
import { SpatialGrid } from '../utils/SpatialGrid.js'
import { useLayerStore } from '../stores/layerStore.js'
import {
  getPointAt, getTextAt, getLineAt, getBsplineAt,
  getAreaAt, hasOverlappingPointInLayer
} from '../utils/hitTesting.js'
import {
  toWorldSelectionBox,
  collectSelectionIdsByBox
} from '../composables/mouse/selectionBox.js'
import { createMouseHitTestStrategy } from '../composables/mouse/hitTestStrategy.js'
import { createMouseTextEditingManager } from '../composables/mouse/textEditingManager.js'
import { createMouseDownToolDispatcher } from '../composables/mouse/mouseDownToolDispatcher.js'
import { createMouseSelectionEvents } from '../composables/mouse/selectionEvents.js'
import { createMouseMoveFlow } from '../composables/mouse/mouseMoveFlow.js'

export default {
  name: 'MouseEventHandler',
  props: {
    canvas: { type: HTMLCanvasElement, default: null },
    isLoading: { type: Boolean, default: false },
    currentTool: { type: String, default: null },
    points: { type: Array, default: () => [] },
    lines: { type: Array, default: () => [] },
    bsplines: { type: Array, default: () => [] },
    texts: { type: Array, default: () => [] },
    selectedPoints: { type: Array, default: () => [] },
    selectedLines: { type: Array, default: () => [] },
    selectedTexts: { type: Array, default: () => [] },
    areas: { type: Array, default: () => [] },
    selectedAreas: { type: Array, default: () => [] },
    selectionMode: { type: String, default: 'single' },
    scale: { type: Number, default: 1 },
    minScale: { type: Number, default: 0.001 },
    maxScale: { type: Number, default: 50 },
    offset: { type: Object, default: () => ({ x: 0, y: 0 }) },
    bsplineParams: { type: Object, default: () => ({}) }
  },
  emits: [
    'point-added', 'point-selected', 'line-selected', 'line-created',
    'bspline-created', 'points-deleted', 'clear-mode', 'undo',
    'text-added', 'text-selected', 'area-selected', 'selection-changed',
    'update-canvas-state', 'show-context-menu', 'show-toast'
  ],
  created() {
    this.throttledMouseMove = EventUtils.throttle(this.handleMouseMoveCore.bind(this), 16)
    this.throttledWheel = EventUtils.throttle(this.handleWheelCore.bind(this), 16)
    // debouncedSelection 已移除：鼠标移动有 16ms 节流，无需额外 debounce，避免框选框延迟
    this.debouncedRebuildGrids = EventUtils.debounce(this.rebuildSpatialGrids.bind(this), 50)

    this._onMouseDown = this.handleMouseDown.bind(this)
    this._onMouseMove = this.throttledMouseMove
    this._onContextMenu = this.handleRightClick.bind(this)
    this._onWheel = this.throttledWheel
    this._onMouseUp = this.handleMouseUp.bind(this)

    this.hitTestStrategy = createMouseHitTestStrategy({
      getPointAt: (x, y) => this._getPointAt(x, y),
      getTextAt: (x, y) => this._getTextAt(x, y),
      getBsplineAt: (x, y) => this._getBsplineAt(x, y),
      getLineAt: (x, y) => this._getLineAt(x, y),
      getAreaAt: (x, y) => this._getAreaAt(x, y)
    })

    this.textEditingManager = createMouseTextEditingManager(this)
    this.mouseDownToolDispatcher = createMouseDownToolDispatcher(this)
    this.selectionEvents = createMouseSelectionEvents(this)
    this.mouseMoveFlow = createMouseMoveFlow(this)
  },
  data() {
    return {
      isDragging: false,
      isPanning: false,
      panStart: { x: 0, y: 0 },
      canvasRect: null,
      selectionStart: null,
      selectionEnd: null,
      wasSelection: false,

      // 曲线绘制状态
      curveStartPoint: null,
      curveEndPoint: null,
      curveControlPoints: [],

      mousePosition: { x: 0, y: 0 },
      tempLineStart: null,
      isTextEditing: false,
      currentText: null,
      textInput: null,

      // 空间网格（由 SpatialGrid 类管理）
      pointGrid: null,
      textGrid: null,
      lineGrid: null,
      bsplineGrid: null,
      areaGrid: null, // 新增：区域空间网格，可选加速
      lineGridDirty: true,
      bsplineGridDirty: true,
      areaGridDirty: true, // 新增：区域网格脏标记
      gridCellSize: 500, // 大幅增大cellSize，大幅减少候选数量

      // pointById 缓存
      _pointByIdCache: null,

      // 复用的查询结果数组（减少 GC）
      _queryScratch: []
    }
  },
  computed: {
    coordinateConverter() {
      return (x, y) => ({
        worldX: (x - (this.offset?.x || 0)) / this.scale,
        worldY: -(y - (this.offset?.y || 0)) / this.scale
      })
    },
    hasAnySelection() {
      return this.selectedPoints.length + this.selectedLines.length +
        this.selectedTexts.length + this.selectedAreas.length > 0
    },
    totalSelectionCount() {
      return this.selectedPoints.length + this.selectedLines.length +
        this.selectedTexts.length + this.selectedAreas.length
    },
    layerStore() {
      return useLayerStore()
    },
    visibleLayerNames() {
      // 返回所有可见的图层ID（而不是名称）
      return this.layerStore.layers
        .filter(layer => layer.visible)
        .map(layer => layer.id)
    }
  },
  watch: {
    isLoading(next, prev) { if (prev && !next) this.rebuildSpatialGrids() },
    canvas(newCanvas, oldCanvas) {
      if (oldCanvas) this.cleanupMouseEvents()
      if (newCanvas) { this.setupMouseEvents(); this.rebuildSpatialGrids() }
    },
    'points.length'() { this._pointByIdCache = null; if (!this.isLoading) this.debouncedRebuildGrids() },
    'lines.length'() { if (!this.isLoading) this.lineGridDirty = true },
    'bsplines.length'() { if (!this.isLoading) this.bsplineGridDirty = true },
    'texts.length'() { if (!this.isLoading) this.debouncedRebuildGrids() },
    'areas.length'() { if (!this.isLoading) this.areaGridDirty = true }, // 新增：区域变化时标记网格为脏
    currentTool(newTool, oldTool) {
      if (oldTool === 'curve') this.resetCurveState()
      if (newTool !== 'line') this.tempLineStart = null
      if (newTool !== 'text') this.finishTextEditing()
      this.syncTempState()
    }
  },
  beforeUnmount() {
    this.cleanupMouseEvents()
    this.cleanupTextInput()
  },
  methods: {
    // ─── 空间网格 ───────────────────────────────────────────────────────

    getPointById(id) {
      if (!this._pointByIdCache) {
        this._pointByIdCache = new Map(this.points.map(p => [p.id, p]))
      }
      return this._pointByIdCache.get(id)
    },

    rebuildSpatialGrids() {
      this.pointGrid = SpatialGrid.fromPoints(this.points, this.gridCellSize)
      this.textGrid = SpatialGrid.fromTexts(this.texts, this.gridCellSize)
      this.lineGridDirty = true
      this.bsplineGridDirty = true
      this.areaGridDirty = true // 新增：标记区域网格为脏
    },

    ensureLineGrid() {
      if (!this.lineGridDirty && this.lineGrid) return
      const pointById = new Map(this.points.map(p => [p.id, p]))
      this.lineGrid = SpatialGrid.fromLines(this.lines, pointById, this.gridCellSize)
      this.lineGridDirty = false
    },

    ensureBsplineGrid() {
      if (!this.bsplineGridDirty && this.bsplineGrid) return
      const pointById = new Map(this.points.map(p => [p.id, p]))
      this.bsplineGrid = SpatialGrid.fromBsplines(this.bsplines, pointById, this.gridCellSize)
      this.bsplineGridDirty = false
    },

    // 新增：确保区域网格构建，向后兼容
    ensureAreaGrid() {
      if (!this.areaGridDirty && this.areaGrid) return
      this.areaGrid = SpatialGrid.fromAreas(this.areas, this.gridCellSize)
      this.areaGridDirty = false
    },

    // 检查元素是否在可见图层中
    isElementInVisibleLayer(element) {
      if (!this.visibleLayerNames || this.visibleLayerNames.length === 0) return true
      
      // 检查layerIds（新格式）
      if (Array.isArray(element.layerIds) && element.layerIds.length > 0) {
        return element.layerIds.some(id => this.visibleLayerNames.includes(id))
      }
      // 检查layerId（旧格式）
      if (element.layerId) {
        return this.visibleLayerNames.includes(element.layerId)
      }
      // 检查layername（兼容格式）
      if (element.layername) {
        return this.visibleLayerNames.includes(element.layername)
      }
      // 默认在g图层
      return this.visibleLayerNames.includes('g')
    },

    _getPointAt(x, y) {
      if (!this.pointGrid) return undefined
      return getPointAt(this.pointGrid, x, y, this.scale, this._queryScratch, this.visibleLayerNames)
    },
    _getTextAt(x, y) {
      if (!this.textGrid) return undefined
      return getTextAt(this.textGrid, x, y, this.scale, this._queryScratch)
    },
    _getLineAt(x, y) {
      this.ensureLineGrid()
      return getLineAt(this.lineGrid, id => this.getPointById(id), x, y, this.scale, this._queryScratch)
    },
    _getBsplineAt(x, y) {
      this.ensureBsplineGrid()
      return getBsplineAt(this.bsplineGrid, id => this.getPointById(id), x, y, this.scale, this._queryScratch)
    },
    _getAreaAt(x, y) { return getAreaAt(this.areas, x, y) },

    _findHitElement(worldX, worldY) {
      return this.hitTestStrategy.findFirstAt(worldX, worldY)
    },

    // ─── 事件绑定 ────────────────────────────────────────────────────────

    setupMouseEvents() {
      this.cleanupMouseEvents()
      if (!this.canvas) return
      this.updateCanvasRect()
      this.rebuildSpatialGrids()
      this.canvas.addEventListener('mousedown', this._onMouseDown)
      this.canvas.addEventListener('mousemove', this._onMouseMove)
      this.canvas.addEventListener('contextmenu', this._onContextMenu)
      this.canvas.addEventListener('wheel', this._onWheel, { passive: false })
      document.addEventListener('mouseup', this._onMouseUp)
    },

    cleanupMouseEvents() {
      if (this.canvas) {
        this.canvas.removeEventListener('mousedown', this._onMouseDown)
        this.canvas.removeEventListener('mousemove', this._onMouseMove)
        this.canvas.removeEventListener('contextmenu', this._onContextMenu)
        this.canvas.removeEventListener('wheel', this._onWheel)
      }
      document.removeEventListener('mouseup', this._onMouseUp)
    },

    // ─── 辅助 ────────────────────────────────────────────────────────────

    updateCanvasRect() {
      this.canvasRect = this.canvas ? this.canvas.getBoundingClientRect() : null
    },

    getMousePositionFromEvent(event) {
      const rect = this.canvasRect || this.canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    },

    isPointInCanvas(clientX, clientY) {
      const r = this.canvasRect || (this.canvas ? this.canvas.getBoundingClientRect() : null)
      if (!r) return false
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
    },

    clearAllSelection() {
      this.selectionEvents.clearAllSelection()
    },

    resetSelectionState() {
      this.selectionStart = null
      this.selectionEnd = null
      this.wasSelection = false
      this.$emit('update-canvas-state', {
        selectionStart: null, selectionEnd: null, wasSelection: false,
        tempLineStart: null, curveStartPoint: null, curveEndPoint: null, curveControlPoints: []
      })
    },

    syncTempState() {
      this.$emit('update-canvas-state', {
        tempLineStart: this.tempLineStart,
        curveStartPoint: this.curveStartPoint,
        curveEndPoint: this.curveEndPoint,
        curveControlPoints: [...this.curveControlPoints]
      })
    },

    syncTempLineState() {
      this.$emit('update-canvas-state', { tempLineStart: this.tempLineStart })
    },

    updateSelection() {
      this.$emit('update-canvas-state', {
        selectionStart: this.selectionStart,
        selectionEnd: this.selectionEnd,
        wasSelection: this.wasSelection,
        tempLineStart: this.tempLineStart,
        curveStartPoint: this.curveStartPoint,
        curveEndPoint: this.curveEndPoint,
        curveControlPoints: [...this.curveControlPoints]
      })
    },

    // ─── 鼠标事件处理 ────────────────────────────────────────────────────

    handleMouseDown(event) {
      this.updateCanvasRect()
      const { x, y } = this.getMousePositionFromEvent(event)

      if (event.button === 1) {
        event.preventDefault()
        this.isPanning = true
        this.panStart = { x: event.clientX, y: event.clientY }
        this.$emit('update-canvas-state', { interaction: { panning: true } })
        return
      }

      if (event.button !== 0) return

      this.mouseDownToolDispatcher.dispatchLeftToolAction(x, y)
    },

    handleMouseMoveCore(event) {
      if (!this.canvas) return
      const { x, y } = this.getMousePositionFromEvent(event)
      this.mousePosition = { x, y }

      this.mouseMoveFlow.handleMove(event, x, y)
    },

    handleWheelCore(event) {
      if (!this.canvas) return
      event.preventDefault()
      this.updateCanvasRect()
      const { x, y } = this.getMousePositionFromEvent(event)
      const delta = event.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta))
      const { worldX, worldY } = this.coordinateConverter(x, y)
      this.$emit('update-canvas-state', {
        scale: newScale,
        offset: { x: x - worldX * newScale, y: y + worldY * newScale }
      })
    },

    handleMouseUp(event) {
      if (this.isPanning) {
        this.isPanning = false
        this.$emit('update-canvas-state', { interaction: { panning: false } })
        return
      }

      if (event.button === 0 && this.currentTool === null) {
        this.updateCanvasRect()
        const inCanvas = this.isPointInCanvas(event.clientX, event.clientY)

        if (this.wasSelection) {
          this.selectElementsInBox()
        } else if (inCanvas) {
          const rect = this.canvasRect || (this.canvas ? this.canvas.getBoundingClientRect() : null)
          if (!rect) {
            this.resetSelectionState()
            return
          }
          const x = event.clientX - rect.left
          const y = event.clientY - rect.top
          const { worldX, worldY } = this.coordinateConverter(x, y)

          const hit = this._findHitElement(worldX, worldY)

          if (hit) {
            this.selectSingleElement(x, y, hit)
          } else if (this.hasAnySelection) {
            this.clearAllSelection()
          }
        }

        this.resetSelectionState()
      }
    },

    handleRightClick(event) {
      event.preventDefault()
      if (this.currentTool !== null) {
        this.$emit('clear-mode')
      } else if (this.selectedPoints.length > 0) {
        if (this.totalSelectionCount > 1) {
          this.clearAllSelection()
        } else {
          this.$emit('show-context-menu', {
            x: event.clientX,
            y: event.clientY,
            selectedPoint: this.getPointById(this.selectedPoints[0])
          })
        }
      } else {
        this.clearAllSelection()
        this.resetSelectionState()
      }
    },

    // ─── 工具处理 ────────────────────────────────────────────────────────

    addPoint(x, y) {
      const { worldX, worldY } = this.coordinateConverter(x, y)
      
      // 检查该位置是否已有点存在（重合检测，仅限可见图层）
      const existingPoint = this._getPointAt(worldX, worldY)
      if (existingPoint) {
        // 触发toast提示事件
        this.$emit('show-toast', {
          type: 'error',
          title: '位置冲突',
          message: '该位置已存在控制点，请选择其他位置添加。',
          duration: 3000
        })
        return
      }
      
      // 创建新点对象（用于重合检测）
      const newPoint = {
        id: Date.now(), x: worldX, y: worldY,
        type: this.currentTool || 'point',
        name: 'NoName', color: '', angle: 0.0, 
        fields: {}, mustFree: []
        // layerIds将在下面添加
      }
      
      // 为新点分配图层（用于重合检测）
      const pointWithLayers = this.layerStore.assignElementToVisibleLayers(newPoint)
      
      // 检查同一图层是否存在重合点
      if (hasOverlappingPointInLayer(this.pointGrid, pointWithLayers, this.scale, this._queryScratch)) {
        this.$emit('show-toast', {
          type: 'warning',
          title: '重合点限制',
          message: '同一图层8px范围内已存在点，请选择其他位置。',
          duration: 3000
        })
        return
      }
      
      this.$emit('point-added', pointWithLayers)
    },

    handleLineTool(x, y) {
      const { worldX, worldY } = this.coordinateConverter(x, y)
      const clicked = this._getPointAt(worldX, worldY)
      
      if (import.meta.env.DEV) console.log('🔍 DEBUG: handleLineTool', { worldX, worldY, clicked, tempLineStart: this.tempLineStart })

      if (!this.tempLineStart) {
        if (clicked) { 
          this.tempLineStart = clicked; 
          this.syncTempLineState() 
          if (import.meta.env.DEV) console.log('🔍 DEBUG: Line start point set', this.tempLineStart)
        }
      } else {
        if (clicked && clicked.id !== this.tempLineStart.id && !this.lineExists(this.tempLineStart.id, clicked.id)) {
          const lineData = {
            id: Date.now(),
            startPointId: this.tempLineStart.id,
            endPointId: clicked.id,
            mode: this.selectionMode,
            name: 'NoName', color: '', angle: 0.0, 
            fields: {}, mustFree: []
            // layerIds将由useElementOps.js中的assignElementToVisibleLayers添加
          }
          if (import.meta.env.DEV) console.log('🔍 DEBUG: Emitting line-created', lineData)
          this.$emit('line-created', lineData)
        } else {
          if (import.meta.env.DEV) console.log('🔍 DEBUG: Line not created', { clicked, tempLineStart: this.tempLineStart, lineExists: this.lineExists(this.tempLineStart.id, clicked?.id) })
        }
        this.tempLineStart = null
        this.syncTempLineState()
      }
    },

    lineExists(startId, endId) {
      return this.lines.some(l =>
        this.selectionMode === 'single'
          ? l.startPointId === startId && l.endPointId === endId
          : (l.startPointId === startId && l.endPointId === endId) ||
            (l.startPointId === endId && l.endPointId === startId)
      )
    },

    handleCurveTool(x, y) {
      const { worldX, worldY } = this.coordinateConverter(x, y)
      const clicked = this._getPointAt(worldX, worldY)

      if (!this.curveStartPoint) {
        if (clicked) { this.curveStartPoint = clicked; this.syncTempState() }
      } else if (!this.curveEndPoint) {
        if (clicked && clicked.id !== this.curveStartPoint.id) {
          this.curveEndPoint = clicked
          this.createCurve()
        } else {
          this.curveControlPoints.push({ id: Date.now(), x: worldX, y: worldY })
          this.syncTempState()
        }
      }
    },

    createCurve() {
      if (this.curveStartPoint && this.curveEndPoint) {
        this.$emit('bspline-created', {
          id: Date.now(),
          startPointId: this.curveStartPoint.id,
          endPointId: this.curveEndPoint.id,
          controlPointIds: this.curveControlPoints.map(p => p.id),
          controlPoints: [...this.curveControlPoints],
          params: { ...this.bsplineParams },
          mode: this.selectionMode,
          name: 'NoName', color: '', angle: 0.0, 
          fields: {}, mustFree: []
          // layerIds将由useElementOps.js中的assignElementToVisibleLayers添加
        })
        this.resetCurveState()
      }
    },

    resetCurveState() {
      this.curveStartPoint = null
      this.curveEndPoint = null
      this.curveControlPoints = []
      this.syncTempState()
    },

    handleTextTool(x, y) {
      const { worldX, worldY } = this.coordinateConverter(x, y)
      const clicked = this._getTextAt(worldX, worldY)
      if (clicked) {
        this.startTextEditing(clicked)
      } else {
        const text = {
          id: Date.now(), name: '新文本', x: worldX, y: worldY,
          color: '#ffffff', fontSize: 36, angle: 0.0, 
          fields: {}, mustFree: []
          // layerIds将由useElementOps.js中的assignElementToVisibleLayers添加
        }
        this.$emit('text-added', text)
        this.startTextEditing(text)
      }
    },

    startTextEditing(text) {
      this.textEditingManager.startTextEditing(text)
    },

    createTextInput(text) {
      this.textEditingManager.createTextInput(text)
    },

    finishTextEditing() {
      this.textEditingManager.finishTextEditing()
    },

    cancelTextEditing() {
      this.textEditingManager.cancelTextEditing()
    },

    cleanupTextInput() {
      this.textEditingManager.cleanupTextInput()
    },

    // ─── 框选 ────────────────────────────────────────────────────────────

    selectElementsInBox() {
      if (!this.selectionStart || !this.selectionEnd) return

      // 修复：确保空间网格是最新的
      this.rebuildSpatialGrids()

      const box = toWorldSelectionBox(
        this.selectionStart,
        this.selectionEnd,
        this.offset,
        this.scale
      )
      if (!box) return

      const selected = collectSelectionIdsByBox({
        box,
        points: this.points,
        lines: this.lines,
        bsplines: this.bsplines,
        texts: this.texts,
        areas: this.areas,
        getPointById: (id) => this.getPointById(id),
        isElementInVisibleLayer: (element) => this.isElementInVisibleLayer(element)
      })

      this.selectionEvents.emitBatchSelection(selected)
    },

    selectSingleElement(x, y, precomputedHit = null) {
      const { worldX, worldY } = this.coordinateConverter(x, y)
      const hit = precomputedHit || this._findHitElement(worldX, worldY)
      this.selectionEvents.selectSingleHit(hit)
    }
  }
}
</script>

<style scoped>
.mouse-event-handler { display: none; }
</style>
