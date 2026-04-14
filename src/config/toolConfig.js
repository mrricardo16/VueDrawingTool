/**
 * 工具栏配置中心
 * 将 DrawingTools 中硬编码配置解耦到独立模块
 */

export const TOOL_ITEMS = [
  { id: 'point', name: '点', icon: new URL('../Image/普通点.png', import.meta.url).href },
  { id: 'site', name: '站点', icon: new URL('../Image/站点.png', import.meta.url).href },
  { id: 'rest', name: '休息点', icon: new URL('../Image/休息点.png', import.meta.url).href },
  { id: 'charging', name: '充电站', icon: new URL('../Image/充电点.png', import.meta.url).href },
  { id: 'text', name: '文本', icon: new URL('../Image/文本.png', import.meta.url).href },
  { id: 'line', name: '直线', icon: new URL('../Image/直线.png', import.meta.url).href },
  { id: 'curve', name: '曲线', icon: new URL('../Image/B样条曲线.png', import.meta.url).href },
  { id: 'area', name: '区域', icon: new URL('../Image/区域.png', import.meta.url).href },
  { id: 'align', name: '对齐', icon: new URL('../Image/对齐.png', import.meta.url).href, clickMode: 'toggle-dropdown' }
]

export const ACTION_ITEMS = [
  { id: 'upload', name: '打开本地', icon: '📁', inMore: true },
  { id: 'save', name: '保存本地', icon: '💾', inMore: true },
  { id: 'upload-server', name: '上传地图', icon: '☁️', inMore: true },
  { id: 'fit-view', name: '调整视图', icon: '🎯', inMore: true },
  { id: 'more', name: '更多', icon: '⋯', clickMode: 'toggle-dropdown' },
  { id: 'delete', name: '删除', icon: '🗑️' },
  { id: 'undo', name: '撤回', icon: '↶' },
  { id: 'move', name: '移动', icon: new URL('../Image/移动.png', import.meta.url).href },
  { id: 'layer', name: '图层', icon: '📚', isCustom: true }
]

export function getToolDropdownConfig(toolId, selectionMode, lineReverseEnabled = false) {
  switch (toolId) {
    case 'line':
      return {
        title: '线设置',
        items: [
          { label: '单向', value: 'single', active: selectionMode === 'single' },
          { label: '全向', value: 'bidirectional', active: selectionMode === 'bidirectional' },
          { label: `${lineReverseEnabled ? '☑' : '☐'} 倒车`, value: 'reverse-toggle', active: lineReverseEnabled, keepOpen: true }
        ]
      }
    case 'curve':
      return {
        title: '曲线设置',
        items: [
          { label: '单向', value: 'single', active: selectionMode === 'single' },
          { label: '全向', value: 'bidirectional', active: selectionMode === 'bidirectional' },
          { label: `${lineReverseEnabled ? '☑' : '☐'} 倒车`, value: 'reverse-toggle', active: lineReverseEnabled, keepOpen: true }
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
