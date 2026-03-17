import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useHistory } from '../composables/useHistory.js'
import { useElementOps } from '../composables/useElementOps.js'
import { useContextMenuHandler } from '../composables/useContextMenuHandler.js'
import { useMapIO } from '../composables/useMapIO.js'
import { useLayerStore } from './layerStore.js'

/**
 * @typedef {import('../models/types').Point} Point
 * @typedef {import('../models/types').Line} Line
 * @typedef {import('../models/types').BSpline} BSpline
 * @typedef {import('../models/types').TextElement} TextElement
 * @typedef {import('../models/types').Area} Area
 */

export const useMapStore = defineStore('map', () => {
  // ─── UI 状态（工具/模式）──────────────────────────────────────────────
  const currentTool = ref(null)
  const selectionMode = ref('single')

  // ─── 核心数据 ──────────────────────────────────────────────────────────
  const points = ref([])
  const lines = ref([])
  const bsplines = ref([])
  const texts = ref([])
  const areas = ref([])

  // 选中状态
  const selectedPoints = ref([])
  const selectedLines = ref([])
  const selectedTexts = ref([])
  const selectedAreas = ref([])

  // ID 索引 Map（供视图定位和属性面板快速查找）
  const pointById = ref(new Map())
  const lineById = ref(new Map())
  const textById = ref(new Map())
  const bsplineById = ref(new Map())

  const rebuildIdMaps = () => {
    pointById.value = new Map(points.value.map(p => [p.id, p]))
    lineById.value = new Map(lines.value.map(l => [l.id, l]))
    textById.value = new Map(texts.value.map(t => [t.id, t]))
    bsplineById.value = new Map(bsplines.value.map(b => [b.id, b]))
  }

  /**
   * 深拷贝元素（用于 history before/after 快照）
   * @template T
   * @param {T} el
   * @returns {T}
   */
  const cloneElement = (el) => {
    if (!el || typeof el !== 'object') return el
    const out = { ...el }
    if (Array.isArray(el.controlPoints)) out.controlPoints = el.controlPoints.map(cp => ({ ...cp }))
    if (Array.isArray(el.ControlPoints)) out.ControlPoints = el.ControlPoints.map(cp => ({ ...cp }))
    if (Array.isArray(el.points)) out.points = el.points.map(p => ({ ...p }))
    return out
  }

  // ─── 外部组件引用（可选）──────────────────────────────────────────────
  // MapIO 需要用到 fitToView；App.vue 会把 DrawingCanvas 的 ref 注入进来
  const drawingCanvas = ref(null)
  /**
   * 注入 DrawingCanvas 引用（供 mapIO 调用 fitToView 等）
   * @param {any} canvasRef
   */
  const setDrawingCanvas = (canvasRef) => {
    drawingCanvas.value = canvasRef?.value ? canvasRef.value : canvasRef
  }

  // ─── 图层管理────────────────────────────────────────────────────────────
  const layerStore = useLayerStore()

  // ─── 历史（增量）──────────────────────────────────────────────────────
  const { HistoryOp, history, canUndo, canRedo, record, undo, redo, clearHistory } = useHistory({
    points, lines, bsplines, texts, areas,
    selectedPoints, selectedLines, selectedTexts, selectedAreas,
    maxRecords: 100
  })

  // ─── 元素操作（增删改）────────────────────────────────────────────────
  const elementOps = useElementOps({
    points, lines, bsplines, texts, areas,
    selectedPoints, selectedLines, selectedTexts, selectedAreas,
    pointById, lineById, textById, bsplineById,
    record,
    HistoryOp,
    cloneElement,
    rebuildIdMaps
  })

  // ─── 右键菜单（点类型）───────────────────────────────────────────────
  const contextMenu = useContextMenuHandler(points, record, HistoryOp, cloneElement)

  // ─── 地图IO（加载/保存）───────────────────────────────────────────────
  const mapIO = useMapIO({
    points, lines, bsplines, texts, areas,
    selectedPoints, selectedLines, selectedTexts, selectedAreas,
    record,
    HistoryOp,
    cloneElement,
    drawingCanvas,
    rebuildIdMaps
  })

  // ─── 对齐结果应用（数据写入 + history 统一走 store）────────────────────

  /**
   * 应用对齐结果并写入历史记录
   * @param {{alignedPoints?: Array<Pick<Point,'id'|'x'|'y'>>, alignedTexts?: Array<Pick<TextElement,'id'|'x'|'y'>>}|null} result
   */
  const applyAlignmentResult = (result) => {
    if (!result) return

    const pointIdSet = new Set((result.alignedPoints || []).map(p => p.id))
    const textIdSet = new Set((result.alignedTexts || []).map(t => t.id))

    const pointsBefore = pointIdSet.size
      ? points.value.filter(p => pointIdSet.has(p.id)).map(cloneElement)
      : []
    const textsBefore = textIdSet.size
      ? texts.value.filter(t => textIdSet.has(t.id)).map(cloneElement)
      : []

    let pointsMoved = false
    let textsMoved = false

    ;(result.alignedPoints || []).forEach(ap => {
      const p = points.value.find(pt => pt.id === ap.id)
      if (p) {
        if (p.x !== ap.x || p.y !== ap.y) {
          p.x = ap.x
          p.y = ap.y
          pointsMoved = true
        }
      }
    })
    ;(result.alignedTexts || []).forEach(at => {
      const t = texts.value.find(tx => tx.id === at.id)
      if (t) {
        if (t.x !== at.x || t.y !== at.y) {
          t.x = at.x
          t.y = at.y
          textsMoved = true
        }
      }
    })

    if (!pointsMoved && !textsMoved) return

    // 就地修改对象属性后必须替换数组引用，让视图/空间索引 watcher 感知变化
    if (pointsMoved) points.value = [...points.value]
    if (textsMoved) texts.value = [...texts.value]

    const pointsAfter = pointIdSet.size
      ? points.value.filter(p => pointIdSet.has(p.id)).map(cloneElement)
      : []
    const textsAfter = textIdSet.size
      ? texts.value.filter(t => textIdSet.has(t.id)).map(cloneElement)
      : []

    if (pointsBefore.length) record(HistoryOp.UPDATE, { kind: 'points', before: pointsBefore, after: pointsAfter })
    if (textsBefore.length) record(HistoryOp.UPDATE, { kind: 'texts', before: textsBefore, after: textsAfter })
  }

  // ─── MOVE 记录（drag-start / move-completed）──────────────────────────

  const _moveBefore = ref(null)

  /**
   * 记录拖拽前快照，用于 move 历史项
   * @param {{pointIds?:number[], textIds?:number[], lineIds?:number[], areaIds?:number[]}=} payload
   */
  const handleDragStart = (payload) => {
    const movedPointIds = new Set(payload?.pointIds?.length ? payload.pointIds : selectedPoints.value)
    const movedTextIds = new Set(payload?.textIds?.length ? payload.textIds : selectedTexts.value)

    const movedLineIds = new Set(payload?.lineIds?.length ? payload.lineIds : selectedLines.value)

    const pointsBefore = points.value.filter(p => movedPointIds.has(p.id)).map(cloneElement)
    const textsBefore = texts.value.filter(t => movedTextIds.has(t.id)).map(cloneElement)

    const bsplineIds = new Set()
    for (const b of bsplines.value) {
      // 1) 被显式选中的曲线（line/bspline）必须记录
      if (movedLineIds.has(b.id)) { bsplineIds.add(b.id); continue }

      // 2) 与移动点关联的曲线也应记录（避免端点/控制点移动导致曲线形态变化但未纳入 MOVE）
      const startId = b.startPointId ?? b.siteA
      const endId = b.endPointId ?? b.siteB
      if (startId && movedPointIds.has(startId)) { bsplineIds.add(b.id); continue }
      if (endId && movedPointIds.has(endId)) { bsplineIds.add(b.id); continue }
      if (b.controlPointIds?.some(id => movedPointIds.has(id))) { bsplineIds.add(b.id); continue }
      if (b.pointIds?.some(id => movedPointIds.has(id))) { bsplineIds.add(b.id); continue }
    }
    const bsplinesBefore = bsplineIds.size
      ? bsplines.value.filter(b => bsplineIds.has(b.id)).map(cloneElement)
      : []

    const movedAreaIds = new Set(payload?.areaIds?.length ? payload.areaIds : selectedAreas.value)
    const areasBefore = movedAreaIds.size
      ? areas.value.filter(a => movedAreaIds.has(a.id)).map(cloneElement)
      : []

    _moveBefore.value = {
      pointsBefore, textsBefore, bsplinesBefore,
      areasBefore,
      movedPointIds, movedTextIds, movedLineIds, bsplineIds, movedAreaIds,
    }
  }

  const handleMoveCompleted = () => {
    if (!_moveBefore.value) return

    const pointsAfter = points.value
      .filter(p => _moveBefore.value.movedPointIds?.has(p.id))
      .map(cloneElement)
    const textsAfter = texts.value
      .filter(t => _moveBefore.value.movedTextIds?.has(t.id))
      .map(cloneElement)
    const bsplinesAfter = _moveBefore.value.bsplineIds?.size
      ? bsplines.value.filter(b => _moveBefore.value.bsplineIds.has(b.id)).map(cloneElement)
      : []

    const areasAfter = _moveBefore.value.movedAreaIds?.size
      ? areas.value.filter(a => _moveBefore.value.movedAreaIds.has(a.id)).map(cloneElement)
      : []

    record(HistoryOp.MOVE, {
      pointsBefore:   _moveBefore.value.pointsBefore,
      textsBefore:    _moveBefore.value.textsBefore,
      bsplinesBefore: _moveBefore.value.bsplinesBefore,
      areasBefore:    _moveBefore.value.areasBefore,
      pointsAfter,
      textsAfter,
      bsplinesAfter,
      areasAfter,
    })
    _moveBefore.value = null
  }

  // ─── UI actions ───────────────────────────────────────────────────────

  /**
   * @param {string|null} tool
   */
  const setTool = (tool) => {
    currentTool.value = tool
  }

  /**
   * @param {string} mode
   */
  const setSelectionMode = (mode) => {
    selectionMode.value = mode
  }

  const clearMode = () => {
    currentTool.value = null
    selectedPoints.value = []
    selectedLines.value = []
    selectedTexts.value = []
    selectedAreas.value = []
  }

  return {
    // ui
    currentTool,
    selectionMode,
    setTool,
    setSelectionMode,
    clearMode,

    // state
    points,
    lines,
    bsplines,
    texts,
    areas,
    selectedPoints,
    selectedLines,
    selectedTexts,
    selectedAreas,
    pointById,
    lineById,
    textById,
    bsplineById,

    // refs
    drawingCanvas,

    // helpers
    rebuildIdMaps,
    cloneElement,
    setDrawingCanvas,

    // history
    HistoryOp,
    history,
    canUndo,
    canRedo,
    record,
    undo,
    redo,
    clearHistory,

    // ops
    ...elementOps,

    // context menu
    ...contextMenu,

    // map io
    ...mapIO,

    // alignment
    applyAlignmentResult,

    // move history
    handleDragStart,
    handleMoveCompleted
  }
})
