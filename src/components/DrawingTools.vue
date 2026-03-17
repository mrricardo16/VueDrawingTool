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
        <span v-if="!isCollapsed" class="toolbar-title">工具栏</span>
        <button
          class="collapse-toggle"
          type="button"
          :title="isCollapsed ? '展开工具栏' : '收起工具栏'"
          @click.stop="toggleCollapsed"
        >
          {{ isCollapsed ? '☰' : '—' }}
        </button>
      </div>

      <button
        v-if="isCollapsed"
        class="collapsed-main-btn"
        type="button"
        title="展开工具栏"
        @click.stop="toggleCollapsed"
      >
        🧰
      </button>

      <div v-else class="toolbar-body">
        <div class="toolbar-row">
          <div class="action-group toolbar-group">
            <tool-button
              v-for="action in actions.filter(a => !a.isCustom)"
              :key="action.id"
              :tool="action"
              :is-active="false"
              :compact="compactMode"
              @click="handleActionClick"
            />
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-row">
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
            <LayerDropdown />
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
    'perform-alignment'
  ],
  data() {
    return {
      compactMode: false,
      isCollapsed: false,
      isDragging: false,
      position: { x: 16, y: 16 },
      dragOffset: { x: 0, y: 0 }
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
    this.loadToolbarLayout()
    this.ensureToolbarInViewport()
  },
  beforeUnmount() {
    window.removeEventListener('mousemove', this.handleDragMove)
    window.removeEventListener('mouseup', this.stopDrag)
    window.removeEventListener('resize', this.handleWindowResize)
  },
  methods: {
    getDropdownConfig(toolId) {
      return getToolDropdownConfig(toolId, this.selectionMode)
    },
    handleToolChange(toolId) {
      if (toolId === 'align') return
      this.$emit('tool-change', toolId)
    },
    handleDropdownAction({ toolId, action, item }) {
      switch (toolId) {
        case 'line':
        case 'curve':
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
          this.$emit('upload-to-server')
          break
        case 'fit-view':
          this.$emit('fit-view')
          break
        case 'reset-view':
          this.$emit('reset-view')
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
      this.dragOffset = {
        x: event.clientX - this.position.x,
        y: event.clientY - this.position.y
      }
      window.addEventListener('mousemove', this.handleDragMove)
      window.addEventListener('mouseup', this.stopDrag)
    },
    handleDragMove(event) {
      if (!this.isDragging) return

      const rawX = event.clientX - this.dragOffset.x
      const rawY = event.clientY - this.dragOffset.y
      this.position = this.clampPosition(rawX, rawY)
    },
    stopDrag() {
      if (!this.isDragging) return
      this.isDragging = false
      window.removeEventListener('mousemove', this.handleDragMove)
      window.removeEventListener('mouseup', this.stopDrag)
      this.ensureToolbarInViewport()
      this.saveToolbarLayout()
    },
    clampPosition(x, y) {
      const panel = this.$refs.toolbarPanel
      const panelWidth = panel?.offsetWidth || (this.isCollapsed ? 52 : 920)
      const panelHeight = panel?.offsetHeight || (this.isCollapsed ? 52 : 130)
      const margin = 8

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
        if (!raw) return
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
      } catch {
        // ignore storage parse errors
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
  flex-direction: column;
  justify-content: flex-start;
  border-radius: 14px;
  padding: 10px 12px 12px;
  box-shadow:
    0 10px 28px rgba(5, 12, 24, 0.45),
    0 2px 8px rgba(10, 18, 30, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(6px);
  pointer-events: auto;
}

.floating-toolbar {
  position: fixed;
  left: 0;
  top: 0;
  min-width: 520px;
  max-width: min(980px, calc(100vw - 16px));
}

.floating-toolbar.dragging {
  box-shadow:
    0 14px 30px rgba(4, 10, 20, 0.5),
    0 0 0 1px rgba(99, 179, 237, 0.35);
  opacity: 0.96;
}

.toolbar-head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  margin-bottom: 10px;
  cursor: move;
  user-select: none;
  padding: 0 2px 0 4px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

.drag-grip {
  color: #d5dee9;
  letter-spacing: -1px;
  font-size: 14px;
  opacity: 0.88;
}

.toolbar-title {
  color: #eef4fb;
  font-size: 13px;
  font-weight: 700;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.collapse-toggle {
  margin-left: auto;
  width: 24px;
  height: 24px;
  border: 1px solid rgba(226, 232, 240, 0.25);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.09);
  color: #f7fafc;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  transition: all 0.2s ease;
}

.collapse-toggle:hover {
  background: rgba(99, 179, 237, 0.24);
  border-color: rgba(147, 197, 253, 0.48);
}

.toolbar-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 38px;
}

.toolbar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.toolbar-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.12) 0%,
    rgba(148, 163, 184, 0.45) 18%,
    rgba(148, 163, 184, 0.45) 82%,
    rgba(148, 163, 184, 0.12) 100%
  );
}

.collapsed-main-btn {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(226, 232, 240, 0.28);
  border-radius: 10px;
  background: linear-gradient(145deg, rgba(99, 179, 237, 0.22), rgba(45, 55, 72, 0.35));
  color: #ffffff;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s ease;
}

.collapsed-main-btn:hover {
  background: linear-gradient(145deg, rgba(99, 179, 237, 0.35), rgba(45, 55, 72, 0.4));
  border-color: rgba(147, 197, 253, 0.5);
}

.floating-toolbar.collapsed {
  min-width: 0;
  width: 58px;
  height: 84px;
  padding: 8px;
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


  
