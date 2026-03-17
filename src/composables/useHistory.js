/**
 * useHistory.js
 * 管理撤销历史记录。将 App.vue 中的历史逻辑内聚到此处。
 */

import { computed, ref } from 'vue'

/**
 * @typedef {import('../models/types').Point} Point
 * @typedef {import('../models/types').Line} Line
 * @typedef {import('../models/types').BSpline} BSpline
 * @typedef {import('../models/types').TextElement} TextElement
 * @typedef {import('../models/types').Area} Area
 */

const HistoryOp = {
  ADD: 'ADD',
  DELETE: 'DELETE',
  UPDATE: 'UPDATE',
  MOVE: 'MOVE',
  DELETE_MIXED: 'DELETE_MIXED',
  LOAD_MAP: 'LOAD_MAP'
}

/**
 * 增量历史（Operation Log）。
 * - 小操作只记录变更的元素（新增/删除/更新/移动），避免全量 stringify/parse。
 * - 对于“加载地图”这类本质上替换全量数据的操作，记录一次快照（old），允许撤回。
 * @param {{
 * points:any,
 * lines:any,
 * bsplines:any,
 * texts:any,
 * areas:any,
 * selectedPoints?:any,
 * selectedLines?:any,
 * selectedTexts?:any,
 * selectedAreas?:any,
 * maxRecords?:number
 * }} deps
 */
export function useHistory({
  points, lines, bsplines, texts, areas,
  selectedPoints, selectedLines, selectedTexts, selectedAreas,
  maxRecords = 100
}) {
  const history = ref([])
  const cursor = ref(-1)

  const canUndo = computed(() => cursor.value >= 0)
  const canRedo = computed(() => cursor.value < history.value.length - 1)

  /** 清空所有选中状态 */
  const clearSelection = () => {
    if (selectedPoints) selectedPoints.value = []
    if (selectedLines) selectedLines.value = []
    if (selectedTexts) selectedTexts.value = []
    if (selectedAreas) selectedAreas.value = []
  }

  /** @param {{op:string,payload:any,ts?:number}} rec */
  const pushRecord = (rec) => {
    if (cursor.value < history.value.length - 1) {
      history.value = history.value.slice(0, cursor.value + 1)
    }
    history.value.push(rec)
    cursor.value = history.value.length - 1
    if (history.value.length > maxRecords) {
      history.value.shift()
      cursor.value--
    }
  }

  /**
   * 记录一个操作。
   * @param {string} op - HistoryOp
   * @param {object} payload - 操作数据（仅包含变更子集）
   */
  const record = (op, payload) => {
    pushRecord({ op, payload, ts: Date.now() })
  }

  /** @param {{value:any[]}} arrRef @param {Array<number|string>} ids */
  const _removeByIds = (arrRef, ids) => {
    if (!ids?.length) return
    const set = new Set(ids)
    const arr = arrRef.value
    for (let i = arr.length - 1; i >= 0; i--) {
      if (set.has(arr[i]?.id)) arr.splice(i, 1)
    }
  }

  /** @param {{value:any[]}} arrRef @param {Array<any>} items */
  const _upsertMany = (arrRef, items) => {
    if (!items?.length) return
    const arr = arrRef.value
    const idx = new Map()
    for (let i = 0; i < arr.length; i++) idx.set(arr[i]?.id, i)
    for (const it of items) {
      const i = idx.get(it.id)
      if (i === undefined) {
        arr.push(it)
      } else {
        arr[i] = it
      }
    }
  }

  /** @template T @param {T} el @returns {T} */
  const _cloneElement = (el) => {
    if (!el || typeof el !== 'object') return el
    const out = { ...el }
    if (Array.isArray(el.controlPoints)) out.controlPoints = el.controlPoints.map(cp => ({ ...cp }))
    if (Array.isArray(el.ControlPoints)) out.ControlPoints = el.ControlPoints.map(cp => ({ ...cp }))
    if (Array.isArray(el.points)) out.points = el.points.map(p => ({ ...p }))
    return out
  }

  /** @param {Array<any>=} list */
  const _cloneList = (list) => list?.map(_cloneElement) || []

  /** @param {Set<string>} kinds */
  const _touchRefs = (kinds) => {
    // 触发 DrawingCanvas/MouseEventHandler watcher：必须替换数组引用
    if (kinds.has('points')) points.value = [...points.value]
    if (kinds.has('lines')) lines.value = [...lines.value]
    if (kinds.has('bsplines')) bsplines.value = [...bsplines.value]
    if (kinds.has('texts')) texts.value = [...texts.value]
    if (kinds.has('areas') && areas) areas.value = [...areas.value]
  }

  /** @param {{op:string,payload:any}} rec */
  const _applyUndo = (rec) => {
    const touched = new Set()
    const p = rec.payload
    switch (rec.op) {
      case HistoryOp.ADD:
        touched.add(p.kind)
        _removeByIds(_refByKind(p.kind), p.ids)
        break
      case HistoryOp.DELETE:
        touched.add(p.kind)
        _upsertMany(_refByKind(p.kind), _cloneList(p.items))
        break
      case HistoryOp.UPDATE:
        touched.add(p.kind)
        _upsertMany(_refByKind(p.kind), _cloneList(p.before))
        break
      case HistoryOp.MOVE:
        if (p.pointsBefore?.length)   { touched.add('points');   _upsertMany(points,   _cloneList(p.pointsBefore)) }
        if (p.textsBefore?.length)    { touched.add('texts');    _upsertMany(texts,    _cloneList(p.textsBefore)) }
        if (p.bsplinesBefore?.length) { touched.add('bsplines'); _upsertMany(bsplines, _cloneList(p.bsplinesBefore)) }
        if (p.areasBefore?.length && areas) { touched.add('areas'); _upsertMany(areas, _cloneList(p.areasBefore)) }
        break
      case HistoryOp.DELETE_MIXED:
        if (p.points?.length)  { touched.add('points');  _upsertMany(points, _cloneList(p.points)) }
        if (p.lines?.length)   { touched.add('lines');   _upsertMany(lines, _cloneList(p.lines)) }
        if (p.bsplines?.length){ touched.add('bsplines');_upsertMany(bsplines, _cloneList(p.bsplines)) }
        if (p.texts?.length)   { touched.add('texts');   _upsertMany(texts, _cloneList(p.texts)) }
        if (p.areas?.length && areas) { touched.add('areas'); _upsertMany(areas, _cloneList(p.areas)) }
        break
      case HistoryOp.LOAD_MAP:
        // 恢复加载前状态
        touched.add('points'); touched.add('lines'); touched.add('bsplines'); touched.add('texts'); touched.add('areas')
        points.value = _cloneList(p.before.points)
        lines.value = _cloneList(p.before.lines)
        bsplines.value = _cloneList(p.before.bsplines)
        texts.value = _cloneList(p.before.texts)
        if (areas) areas.value = _cloneList(p.before.areas)
        break
      default:
        break
    }
    clearSelection()
    _touchRefs(touched)
  }

  /** @param {{op:string,payload:any}} rec */
  const _applyRedo = (rec) => {
    const touched = new Set()
    const p = rec.payload
    switch (rec.op) {
      case HistoryOp.ADD:
        touched.add(p.kind)
        _refByKind(p.kind).value.push(..._cloneList(p.items))
        break
      case HistoryOp.DELETE:
        touched.add(p.kind)
        _removeByIds(_refByKind(p.kind), p.ids)
        break
      case HistoryOp.UPDATE:
        touched.add(p.kind)
        _upsertMany(_refByKind(p.kind), _cloneList(p.after))
        break
      case HistoryOp.MOVE:
        if (p.pointsAfter?.length)   { touched.add('points');   _upsertMany(points,   _cloneList(p.pointsAfter)) }
        if (p.textsAfter?.length)    { touched.add('texts');    _upsertMany(texts,    _cloneList(p.textsAfter)) }
        if (p.bsplinesAfter?.length) { touched.add('bsplines'); _upsertMany(bsplines, _cloneList(p.bsplinesAfter)) }
        if (p.areasAfter?.length && areas)  { touched.add('areas');  _upsertMany(areas,  _cloneList(p.areasAfter)) }
        break
      case HistoryOp.DELETE_MIXED:
        if (p.pointIds?.length)  { touched.add('points');  _removeByIds(points, p.pointIds) }
        if (p.lineIds?.length)   { touched.add('lines');   _removeByIds(lines, p.lineIds) }
        if (p.bsplineIds?.length){ touched.add('bsplines');_removeByIds(bsplines, p.bsplineIds) }
        if (p.textIds?.length)   { touched.add('texts');   _removeByIds(texts, p.textIds) }
        if (p.areaIds?.length && areas) { touched.add('areas'); _removeByIds(areas, p.areaIds) }
        break
      case HistoryOp.LOAD_MAP:
        // redo 恢复加载后的状态（after）
        if (p.after) {
          touched.add('points'); touched.add('lines'); touched.add('bsplines'); touched.add('texts'); touched.add('areas')
          points.value = _cloneList(p.after.points)
          lines.value = _cloneList(p.after.lines)
          bsplines.value = _cloneList(p.after.bsplines)
          texts.value = _cloneList(p.after.texts)
          if (areas) areas.value = _cloneList(p.after.areas)
        }
        break
      default:
        break
    }
    clearSelection()
    _touchRefs(touched)
  }

  /** @param {'points'|'lines'|'bsplines'|'texts'|'areas'} kind */
  const _refByKind = (kind) => {
    switch (kind) {
      case 'points': return points
      case 'lines': return lines
      case 'bsplines': return bsplines
      case 'texts': return texts
      case 'areas': return areas
      default: return null
    }
  }

  const undo = () => {
    if (!canUndo.value) return
    const rec = history.value[cursor.value]
    _applyUndo(rec)
    cursor.value--
  }

  const redo = () => {
    if (!canRedo.value) return
    cursor.value++
    const rec = history.value[cursor.value]
    _applyRedo(rec)
  }

  const clearHistory = () => {
    history.value = []
    cursor.value = -1
  }

  return {
    HistoryOp,
    history,
    cursor,
    canUndo,
    canRedo,
    record,
    undo,
    redo,
    clearHistory,
    _cloneElement
  }
}
