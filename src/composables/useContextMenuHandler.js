/**
 * useContextMenuHandler.js
 * 右键菜单的显示、关闭和点位类型修改逻辑，从 App.vue 中提取。
 */

import { ref } from 'vue'

export function useContextMenuHandler(points, record, HistoryOp, cloneElement) {
  const contextMenuVisible = ref(false)
  const contextMenuPosition = ref({ x: 0, y: 0 })
  const contextMenuSelectedPoint = ref(null)

  const handleShowContextMenu = (event) => {
    contextMenuPosition.value = { x: event.x, y: event.y }
    contextMenuSelectedPoint.value = event.selectedPoint
    contextMenuVisible.value = true
  }

  const handleCloseContextMenu = () => {
    contextMenuVisible.value = false
    contextMenuSelectedPoint.value = null
  }

  /**
   * @typedef {import('../models/types').Point} Point
   */

  /**
   * @param {{value: Point[]}|any} points
   * @param {(op:string,payload:any)=>void} [record]
   * @param {Record<string,string>} [HistoryOp]
   * @param {<T>(el:T)=>T} [cloneElement]
   */
  const handleChangePointType = (type) => {
    if (!contextMenuSelectedPoint.value) return

    const pointId = contextMenuSelectedPoint.value.id
    const idx = points.value.findIndex(p => p.id === pointId)
    if (idx === -1) return

    const before = cloneElement ? cloneElement(points.value[idx]) : { ...points.value[idx] }
    const point = points.value[idx]
    point.type = type === 'point' ? null : type
    point.fields = point.fields || {}

    // 清空旧类型字段
    delete point.fields.charge
    delete point.fields.standby
    delete point.fields.shelf
    delete point.fields.escape
    delete point.fields.stagingSite
    delete point.fields.codeArrive
    delete point.fields.codeLeave
    delete point.fields.loopid
    delete point.fields.heights

    // 写入新类型字段
    switch (type) {
      case 'charging':
        point.fields.charge = 'true'
        point.fields.codeArrive = 'agv.ActionCharge(true)'
        point.fields.codeLeave = 'agv.ActionCharge(false)'
        break
      case 'rest':
        point.fields.standby = 'true'
        break
      case 'site':
        point.fields.shelf = 'true'
        point.fields.loopid = 'default'
        point.fields.heights = '[300,400]'
        break
      case 'escape':
        point.fields.escape = 'true'
        break
      case 'staging':
        point.fields.stagingSite = 'true'
        break
    }

    const after = cloneElement ? cloneElement(points.value[idx]) : { ...points.value[idx] }
    record?.(HistoryOp.UPDATE, { kind: 'points', before: [before], after: [after] })

    // 触发 DrawingCanvas 的 points watcher（in-place 修改不会触发 watcher）
    points.value = [...points.value]
  }

  return {
    contextMenuVisible,
    contextMenuPosition,
    contextMenuSelectedPoint,
    handleShowContextMenu,
    handleCloseContextMenu,
    handleChangePointType
  }
}
