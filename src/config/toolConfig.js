/**
 * 工具栏配置中心
 * 将 DrawingTools 中硬编码配置解耦到独立模块
 */

export const TOOL_ITEMS = [
  { id: 'point', name: '点', icon: '📍' },
  { id: 'site', name: '站点', icon: '🏭' },
  { id: 'rest', name: '休息点', icon: '🛏' },
  { id: 'charging', name: '充电站', icon: '⚡' },
  { id: 'text', name: '文本', icon: '📝' },
  { id: 'line', name: '直线', icon: '📏' },
  { id: 'curve', name: '曲线', icon: '〰️' },
  { id: 'area', name: '区域', icon: '⬜' },
  { id: 'move', name: '移动', icon: '✋' },
  { id: 'align', name: '对齐', icon: '📐', clickMode: 'toggle-dropdown' }
]

export const ACTION_ITEMS = [
  { id: 'upload', name: '打开本地', icon: '📁' },
  { id: 'save', name: '保存本地', icon: '💾' },
  { id: 'upload-server', name: '上传地图', icon: '☁️' },
  { id: 'fit-view', name: '调整视图', icon: '🎯' },
  { id: 'reset-view', name: '重置视图', icon: '🔄' },
  { id: 'delete', name: '删除', icon: '🗑️' },
  { id: 'undo', name: '撤回', icon: '↶' },
  { id: 'layer', name: '图层', icon: '📚', isCustom: true }
]

export function getToolDropdownConfig(toolId, selectionMode) {
  switch (toolId) {
    case 'line':
    case 'curve':
      return {
        title: '选择模式',
        items: [
          { label: '单向', value: 'single', active: selectionMode === 'single' },
          { label: '全向', value: 'bidirectional', active: selectionMode === 'bidirectional' }
        ]
      }
    case 'align':
      return {
        title: '对齐方式',
        items: [
          { label: '水平对齐', value: 'horizontal' },
          { label: '垂直对齐', value: 'vertical' }
        ]
      }
    default:
      return null
  }
}
