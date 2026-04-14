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
  const updateSelectedPoint = (mutator) => {
    if (!contextMenuSelectedPoint.value) return

    const pointId = contextMenuSelectedPoint.value.id
    const idx = points.value.findIndex(p => p.id === pointId)
    if (idx === -1) return

    const before = cloneElement ? cloneElement(points.value[idx]) : { ...points.value[idx] }
    const point = points.value[idx]
    point.fields = point.fields || {}
    mutator(point)
    const after = cloneElement ? cloneElement(points.value[idx]) : { ...points.value[idx] }
    if (JSON.stringify(before) === JSON.stringify(after)) return
    record?.(HistoryOp.UPDATE, { kind: 'points', before: [before], after: [after] })

    // 触发 DrawingCanvas 的 points watcher（in-place 修改不会触发 watcher）
    points.value = [...points.value]
  }

  const handleChangePointType = (type) => {
    updateSelectedPoint((point) => {
    point.type = type === 'point' ? null : type

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
    })
  }

  const toggleField = (field, valueWhenOn = 'true') => {
    updateSelectedPoint((point) => {
      if (point.fields[field] != null) delete point.fields[field]
      else point.fields[field] = valueWhenOn
    })
  }

  const handleContextMenuAction = (action) => {
    switch (action) {
      case 'set-site':
        toggleField('shelf')
        return
      case 'set-charge':
        updateSelectedPoint((point) => {
          if (point.fields.shelf === 'true') return
          if (point.fields.charge != null) {
            delete point.fields.charge
            delete point.fields.codeArrive
            delete point.fields.codeLeave
          } else {
            point.fields.charge = 'true'
            point.fields.codeArrive = 'agv.ActionCharge(true);'
            point.fields.codeLeave = 'agv.ActionCharge(false);'
          }
        })
        return
      case 'set-standby':
        toggleField('standby')
        return
      case 'set-staging':
        updateSelectedPoint((point) => {
          if (point.fields.shelf === 'true') return
          if (point.fields.stagingSite != null) delete point.fields.stagingSite
          else point.fields.stagingSite = 'true'
        })
        return
      case 'disable-init':
        toggleField('no_reset')
        return
      case 'set-loopid':
        updateSelectedPoint((point) => {
          if (point.fields.loopid != null) {
            delete point.fields.loopid
            return
          }
          const val = window.prompt('请输入 loopid', '')
          if (val == null) return
          if (!val.trim()) return
          point.fields.loopid = val.trim()
        })
        return
      case 'set-heights': {
        const val = window.prompt('请输入楼层(如 [300,400])', '[300,400]')
        if (val == null) return
        updateSelectedPoint((point) => {
          if (!val.trim()) delete point.fields.heights
          else point.fields.heights = val.trim()
        })
        return
      }
      case 'enable-inter-action':
        toggleField('interAction')
        return
      case 'enable-leave-action':
        toggleField('leaveAction')
        return
      case 'disable-no-block':
        toggleField('no_block')
        return
      case 'set-escape':
        toggleField('escape')
        return
      case 'set-priority':
        updateSelectedPoint((point) => {
          if (point.fields.charge !== 'true' && point.fields.standby !== 'true') return
          const current = point.fields.priority || '0'
          const val = window.prompt('请输入优先级', current)
          if (val == null) return
          if (!val.trim()) delete point.fields.priority
          else point.fields.priority = val.trim()
        })
        return
      case 'set-change-pos':
        toggleField('actionChangePos')
        return
      default:
        return
    }
  }

  return {
    contextMenuVisible,
    contextMenuPosition,
    contextMenuSelectedPoint,
    handleShowContextMenu,
    handleCloseContextMenu,
    handleChangePointType,
    handleContextMenuAction
  }
}
