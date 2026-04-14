<template>
  <div class="floating-toolbar-host">
    <div
      ref="toolbarPanel"
      class="toolbar floating-toolbar"
      :class="{ collapsed: isCollapsed, dragging: isDragging }"
      :style="toolbarStyle"
      @mousedown.stop
    >
      <div class="toolbar-head" @mousedown.stop.prevent="startDrag">
        <span class="drag-grip" title="拖动工具栏">⋮⋮</span>
      </div>

      <button
        class="collapse-toggle"
        type="button"
        :title="isCollapsed ? '展开工具栏' : '收起工具栏'"
        @click.stop="handleCollapseClick"
      >
        {{ isCollapsed ? '☰' : '—' }}
      </button>

      <button
        v-if="isCollapsed"
        class="collapsed-main-btn"
        type="button"
        title="展开工具栏"
        @click.stop="handleCollapseClick"
        @mousedown.stop.prevent="startDrag"
      >
        🧰
      </button>

      <div v-else class="toolbar-body">
        <div class="toolbar-row">
          <div class="action-group toolbar-group">
            <tool-button
              v-for="action in actions.filter(a => !a.isCustom && !a.inMore && ['delete','undo','move','more'].indexOf(a.id) === -1)"
              :key="action.id"
              :tool="action"
              :is-active="false"
              :compact="compactMode"
              :dropdown-config="getActionDropdownConfig(action.id)"
              @click="handleActionClick"
              @dropdown-action="handleActionDropdown"
            />
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-row">
          <div class="tool-area">
            <div class="tool-group toolbar-group">
              <tool-button
                v-for="tool in tools"
                :key="tool.id"
                :tool="tool"
                :is-active="currentTool === tool.id"
                :compact="compactMode"
                :dropdown-config="getDropdownConfig(tool.id)"
                @click="handleToolChange"
                @dropdown-action="handleDropdownAction"
              />
            </div>

            <div class="right-actions toolbar-group">
              <tool-button
                v-for="aid in ['undo','delete','move']"
                :key="aid"
                :tool="actions.find(a => a.id === aid)"
                :is-active="false"
                :compact="compactMode"
                :dropdown-config="getActionDropdownConfig(aid)"
                @click="handleActionClick"
                @dropdown-action="handleActionDropdown"
              />

              <tool-button
                v-if="actions.find(a => a.id === 'more')"
                :key="'more-right'"
                :tool="actions.find(a => a.id === 'more')"
                :is-active="false"
                :compact="compactMode"
                :dropdown-config="getActionDropdownConfig('more')"
                @click="handleActionClick"
                @dropdown-action="handleActionDropdown"
              />

              <LayerDropdown />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ToolButton from './ToolButton.vue'
import LayerDropdown from './LayerDropdown.vue'
import { TOOL_ITEMS, ACTION_ITEMS, getToolDropdownConfig } from '../config/toolConfig.js'
import { ElMessageBox } from 'element-plus'

const TOOLBAR_STORAGE_KEY = 'map-toolbar-layout-v1'

export default {
  name: 'DrawingTools',
  components: {
    ToolButton,
    LayerDropdown
  },
  props: {
    currentTool: {
      type: String,
      default: null
    },
    selectionMode: {
      type: String,
      default: 'single'
    },
    hasSelection: {
      type: Boolean,
      default: false
    },
    canUndo: {
      type: Boolean,
      default: false
    },
    lineReverseEnabled: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'tool-change',
    'selection-mode-change',
    'upload-map',
    'upload-to-server',
    'save-local',
    'fit-view',
    'reset-view',
    'delete-selected',
    'undo',
    'perform-alignment',
    'reverse-toggle-change'
  ],
  data() {
    return {
      compactMode: false,
      isCollapsed: false,
      isFullscreen: false,
      isDragging: false,
      position: { x: 16, y: 16 },
      dragOffset: { x: 0, y: 0 },
      dragMoved: false,
      suppressClick: false
    }
  },
  computed: {
    tools() {
      return TOOL_ITEMS
    },
    actions() {
      return ACTION_ITEMS
    },
    toolbarStyle() {
      return {
        transform: `translate3d(${this.position.x}px, ${this.position.y}px, 0)`
      }
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleWindowResize)
    const loaded = this.loadToolbarLayout()

    // 如果没有加载到已保存的布局（通常是首次打开或刷新时），
    // 折叠工具栏并尝试固定在属性面板标题的左侧，便于用户快速找到
    if (!loaded) {
      this.isCollapsed = true
      this.$nextTick(() => {
        const header = document.querySelector('.property-panel .panel-header') || document.querySelector('.property-panel-container .panel-header')
        const panel = this.$refs.toolbarPanel
        const margin = 12

        if (header && panel) {
          const hRect = header.getBoundingClientRect()
          const pRect = panel.getBoundingClientRect()
          // 计算放在 header 左侧的 x,y，使工具栏垂直居中于 header
          let targetX = Math.round(hRect.left - pRect.width - margin)
          let targetY = Math.round(hRect.top + (hRect.height - pRect.height) / 2)

          // 限定到主容器或 viewport
          const container = document.querySelector('.main-container') || document.querySelector('.drawing-tool-page') || document.documentElement
          if (container) {
            const cRect = container.getBoundingClientRect()
            const minX = cRect.left + margin
            const maxX = cRect.left + cRect.width - pRect.width - margin
            const minY = cRect.top + margin
            const maxY = cRect.top + cRect.height - pRect.height - margin
            targetX = Math.min(Math.max(minX, targetX), Math.max(minX, maxX))
            targetY = Math.min(Math.max(minY, targetY), Math.max(minY, maxY))
          }

          this.position = { x: targetX, y: targetY }
        } else {
          // 回退到容器左上角内侧
          const container = document.querySelector('.main-container') || document.querySelector('.drawing-tool-page') || document.documentElement
          const rect = container.getBoundingClientRect()
          this.position = this.clampPosition(rect.left + margin, rect.top + margin)
        }

        // 保存布局以便下次恢复
        this.saveToolbarLayout()
        this.ensureToolbarInViewport()
      })
    } else {
      this.ensureToolbarInViewport()
    }
    document.addEventListener('fullscreenchange', this.onFullscreenChange)
  },
  beforeUnmount() {
    window.removeEventListener('mousemove', this.handleDragMove)
    window.removeEventListener('mouseup', this.stopDrag)
    window.removeEventListener('resize', this.handleWindowResize)
    document.removeEventListener('fullscreenchange', this.onFullscreenChange)
  },
  methods: {
    getDropdownConfig(toolId) {
      return getToolDropdownConfig(toolId, this.selectionMode, this.lineReverseEnabled)
    },
    getActionDropdownConfig(actionId) {
      if (actionId === 'more') {
        return {
          title: '更多',
          items: [
            { label: '打开本地', value: 'upload' },
            { label: '保存本地', value: 'save' },
            { label: '上传地图', value: 'upload-server' },
            { label: '调整视图', value: 'fit-view' },
            { label: `${this.isFullscreen ? '☑' : '☐'} 全屏`, value: 'fullscreen-toggle', active: this.isFullscreen, keepOpen: true }
          ]
        }
      }
      return null
    },
    handleToolChange(toolId) {
      if (toolId === 'align') return
      this.$emit('tool-change', toolId)
    },
    handleDropdownAction({ toolId, action }) {
      switch (toolId) {
        case 'line':
          if (action === 'reverse-toggle') {
            this.$emit('reverse-toggle-change', !this.lineReverseEnabled)
            break
          }
          this.$emit('tool-change', 'line')
          this.$emit('selection-mode-change', action)
          break
        case 'curve':
          if (action === 'reverse-toggle') {
            this.$emit('reverse-toggle-change', !this.lineReverseEnabled)
            break
          }
          this.$emit('tool-change', 'curve')
          this.$emit('selection-mode-change', action)
          break
        case 'align':
          this.$emit('perform-alignment', action)
          break
      }
    },
    handleActionClick(actionId) {
      switch (actionId) {
        case 'upload':
          this.$emit('upload-map')
          break
        case 'save':
          this.$emit('save-local')
          break
        case 'upload-server':
          ElMessageBox.confirm(
            '确定要将当前地图上传到服务器吗？上传后将覆盖服务器上的地图，是否继续？',
            '确认上传',
            {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning',
              center: true
            }
          ).then(() => {
            this.$emit('upload-to-server')
          }).catch(() => {})
          break
        case 'fit-view':
          this.$emit('fit-view')
          break
        case 'move':
          this.$emit('tool-change', 'move')
          break
        case 'delete':
          if (this.hasSelection) {
            this.$emit('delete-selected')
          }
          break
        case 'undo':
          if (this.canUndo) {
            this.$emit('undo')
          }
          break
      }
    },
    handleActionDropdown({ toolId, action }) {
      // toolId here is the action id (e.g. 'more'), action is value from dropdown
      switch (action) {
        case 'upload':
          this.$emit('upload-map')
          break
        case 'save':
          this.$emit('save-local')
          break
        case 'upload-server':
          ElMessageBox.confirm(
            '确定要将当前地图上传到服务器吗？上传后将覆盖服务器上的地图，是否继续？',
            '确认上传',
            {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning',
              center: true
            }
          ).then(() => {
            this.$emit('upload-to-server')
          }).catch(() => {})
          break
        case 'fit-view':
          this.$emit('fit-view')
          break
        case 'fullscreen-toggle':
          // Toggle fullscreen for the drawing tool page container if present
          if (this.isFullscreen) {
            this.exitFullscreen()
          } else {
            this.requestFullscreenForContainer()
          }
          break
      }
    },

    onFullscreenChange() {
      this.isFullscreen = !!document.fullscreenElement
      // ensure toolbar stays visible when entering fullscreen
      this.$nextTick(() => this.ensureToolbarInViewport())
    },

    requestFullscreenForContainer() {
      const container = document.querySelector('.drawing-tool-page') || document.documentElement
      if (!container) return
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {})
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen()
      }
    },

    exitFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      }
    },
    toggleCompactMode() {
      this.compactMode = !this.compactMode
    },
    toggleCollapsed() {
      this.isCollapsed = !this.isCollapsed
      this.$nextTick(() => {
        this.ensureToolbarInViewport()
        this.saveToolbarLayout()
      })
    },
    startDrag(event) {
      if (event.button !== 0) return
      this.isDragging = true
      this.dragMoved = false
      this.dragStartPos = { x: event.clientX, y: event.clientY }
      this.dragOffset = {
        x: event.clientX - this.position.x,
        y: event.clientY - this.position.y
      }
      window.addEventListener('mousemove', this.handleDragMove)
      window.addEventListener('mouseup', this.stopDrag)
    },
    handleDragMove(event) {
      if (!this.isDragging) return

      const dx = Math.abs(event.clientX - this.dragStartPos.x)
      const dy = Math.abs(event.clientY - this.dragStartPos.y)
      if (!this.dragMoved && (dx > 4 || dy > 4)) {
        this.dragMoved = true
      }

      const rawX = event.clientX - this.dragOffset.x
      const rawY = event.clientY - this.dragOffset.y
      this.position = this.clampPosition(rawX, rawY)
    },
    stopDrag() {
      if (!this.isDragging) return
      this.isDragging = false
      window.removeEventListener('mousemove', this.handleDragMove)
      window.removeEventListener('mouseup', this.stopDrag)
      // 如果发生了实际移动，抑制随后一次点击以避免误触展开
      if (this.dragMoved) {
        this.suppressClick = true
        setTimeout(() => { this.suppressClick = false }, 300)
      }
      this.ensureToolbarInViewport()
      this.saveToolbarLayout()
    },

    handleCollapseClick(event) {
      // 如果刚刚拖拽过，忽略这次点击
      if (this.suppressClick) {
        this.suppressClick = false
        return
      }
      this.toggleCollapsed()
    },
    clampPosition(x, y) {
      const panel = this.$refs.toolbarPanel
      const panelWidth = panel?.offsetWidth || (this.isCollapsed ? 52 : 920)
      const panelHeight = panel?.offsetHeight || (this.isCollapsed ? 52 : 130)
      const margin = 8

      // 优先限制在主系统的主内容容器内（如 layout 的 .main-container），
      // 若不存在则回退到 drawing tool 页面容器，最后回退到 documentElement
      const container = document.querySelector('.main-container') || document.querySelector('.drawing-tool-page')
      if (container) {
        const rect = container.getBoundingClientRect()
        const minX = rect.left + margin
        const minY = rect.top + margin
        const maxX = rect.left + rect.width - panelWidth - margin
        const maxY = rect.top + rect.height - panelHeight - margin

        return {
          x: Math.min(Math.max(minX, x), Math.max(minX, maxX)),
          y: Math.min(Math.max(minY, y), Math.max(minY, maxY))
        }
      }

      const maxX = Math.max(margin, window.innerWidth - panelWidth - margin)
      const maxY = Math.max(margin, window.innerHeight - panelHeight - margin)

      return {
        x: Math.min(Math.max(margin, x), maxX),
        y: Math.min(Math.max(margin, y), maxY)
      }
    },
    ensureToolbarInViewport() {
      this.position = this.clampPosition(this.position.x, this.position.y)
    },
    handleWindowResize() {
      this.ensureToolbarInViewport()
      this.saveToolbarLayout()
    },
    saveToolbarLayout() {
      try {
        const payload = {
          isCollapsed: this.isCollapsed,
          position: this.position
        }
        localStorage.setItem(TOOLBAR_STORAGE_KEY, JSON.stringify(payload))
      } catch {
        // ignore storage write errors
      }
    },
    loadToolbarLayout() {
      try {
        const raw = localStorage.getItem(TOOLBAR_STORAGE_KEY)
        if (!raw) return false
        const parsed = JSON.parse(raw)
        if (typeof parsed?.isCollapsed === 'boolean') {
          this.isCollapsed = parsed.isCollapsed
        }
        if (
          parsed?.position &&
          Number.isFinite(parsed.position.x) &&
          Number.isFinite(parsed.position.y)
        ) {
          this.position = {
            x: parsed.position.x,
            y: parsed.position.y
          }
        }
        return true
      } catch {
        // ignore storage parse errors
        return false
      }
    }
  }
}
</script>
          
<style scoped>
.floating-toolbar-host {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1100;
}

.toolbar {
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(99, 179, 237, 0.16) 0%, rgba(99, 179, 237, 0) 48%),
    linear-gradient(145deg, rgba(45, 55, 72, 0.88) 0%, rgba(43, 52, 67, 0.88) 45%, rgba(56, 67, 86, 0.9) 100%);
  border: 1px solid rgba(203, 213, 224, 0.28);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
  border-radius: 10px;
  /* reduce padding so toolbar border hugs button borders closely */
  padding: 4px;
  border: 1px solid rgba(203, 213, 224, 0.28);
  box-shadow:
    0 10px 28px rgba(5, 12, 24, 0.45),
    0 2px 8px rgba(10, 18, 30, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(6px);
  pointer-events: auto;
}

.floating-toolbar {
  position: fixed;
  left: 0;
  top: 0;
  min-width: 460px;
  /* 允许工具栏根据内容自动扩展以完整显示所有按钮，不再限制最大宽度 */
  max-width: none;
  width: auto;
}

.floating-toolbar.dragging {
  box-shadow:
    0 14px 30px rgba(4, 10, 20, 0.5),
    0 0 0 1px rgba(99, 179, 237, 0.35);
  opacity: 0.96;
}

.toolbar-head {
  position: absolute;
    left: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
    gap: 6px;
    height: 36px;
    cursor: move;
    user-select: none;
    padding: 4px;
    z-index: 1275;
}

.drag-grip {
  color: #d5dee9;
  letter-spacing: -1px;
  font-size: 12px;
  opacity: 0.88;
}

.collapse-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  color: #e6eef8;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(6, 12, 24, 0.18);
  backdrop-filter: blur(6px);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  z-index: 1275;
}

.collapse-toggle:hover {
  transform: translateY(-50%) scale(1.02);
  background: linear-gradient(180deg, rgba(99,179,237,0.14), rgba(45,55,72,0.08));
  border-color: rgba(99,179,237,0.28);
  box-shadow: 0 10px 30px rgba(34, 86, 173, 0.12);
}

/* 当工具栏折叠时，隐藏右上角的 collapse-toggle（避免与折叠后的主按钮重合） */
.floating-toolbar.collapsed .collapse-toggle {
  display: none;
}

/* 折叠状态下，主按钮可拖动 */
.collapsed-main-btn {
  cursor: move;
  z-index: 1260;
}

.toolbar-body {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
  width: 100%;
  /* keep space for toolbar head and collapse-toggle to avoid overlap */
  padding-left: 52px;
  padding-right: 52px;
  /* 确保所有按钮都完全显示而不被截断 */
  overflow: visible;
  white-space: nowrap;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 34px;
}

.toolbar-group {
  display: flex;
  /* 不允许换行，所有按钮保持在同一水平线 */
  flex-wrap: nowrap;
  gap: 2px;
  align-items: center;
}

.tool-area {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 2px;
}

.tool-area .tool-group {
  flex: 1 1 auto;
  display: flex;
  justify-content: flex-start;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}

/* 仅针对工具组（工具按钮那一行）强制单行显示，超出时横向滚动 */
.tool-group {
  flex-wrap: nowrap;
  /* 允许内部按钮适度收缩以适配一行显示 */
  align-items: center;
}

.toolbar-divider {
  display: none !important;
}

.collapsed-main-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(99, 179, 237, 0.18), rgba(45, 55, 72, 0.2));
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(6, 12, 24, 0.25);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.collapsed-main-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(6, 12, 24, 0.28);
}

.floating-toolbar.collapsed {
  min-width: 0;
  width: 56px;
  height: 56px;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .floating-toolbar {
    min-width: 420px;
    max-width: calc(100vw - 16px);
  }
  
  .toolbar-group {
    gap: 6px;
  }
}

@media (max-width: 768px) {
  .floating-toolbar {
    min-width: 320px;
  }
  
  .toolbar-row {
    min-height: 35px;
  }
  
  .toolbar-group {
    gap: 4px;
  }
}
</style>


  
