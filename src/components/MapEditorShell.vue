<template>
  <div class="editor-shell">
    <DrawingTools
      :current-tool="currentTool"
      :selection-mode="selectionMode"
      :line-reverse-enabled="lineReverseEnabled"
      :has-selection="hasSelection"
      :can-undo="canUndo"
      v-on="drawingToolsListeners"
    />

    <KeyboardEventHandler
      :selected-points="selectedPoints"
      :selected-lines="selectedLines"
      :selected-texts="selectedTexts"
      v-on="keyboardListeners"
    />

    <div class="map-container">
      <DrawingCanvas
        ref="drawingCanvas"
        :is-loading="isLoading"
        :current-tool="currentTool"
        :selection-mode="selectionMode"
        :line-reverse-enabled="lineReverseEnabled"
        :points="points"
        :lines="lines"
        :bsplines="bsplines"
        :texts="texts"
        :areas="areas"
        :selected-points="selectedPoints"
        :selected-lines="selectedLines"
        :selected-texts="selectedTexts"
        :selected-areas="selectedAreas"
        :bspline-params="bsplineParams"
        v-on="drawingCanvasListeners"
      />

      <div class="property-panel-container" :class="{collapsed: propertyPanelCollapsed}" :style="{width: propertyPanelCollapsed ? propertyPanelCollapsedWidth : propertyPanelWidth}">
        <PropertyPanel
          :selected-points="selectedPoints"
          :selected-lines="selectedLines"
          :selected-texts="selectedTexts"
          :selected-areas="selectedAreas"
          :points="points"
          :lines="lines"
          :texts="texts"
          :bsplines="bsplines"
          :areas="areas"
          v-on="propertyPanelListeners"
          :collapsed="propertyPanelCollapsed"
          @element-selection="relayElementSelection"
          @element-focus="relayElementFocus"
        />
      </div>
      <button class="panel-toggle" @click="togglePropertyPanel" :title="propertyPanelCollapsed ? '展开属性' : '收起属性'" :aria-pressed="!propertyPanelCollapsed">
        <span class="panel-toggle-icon" :class="{collapsed: propertyPanelCollapsed}">▶</span>
      </button>
    </div>
  </div>
</template>

<script>
import DrawingCanvas from './DrawingCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import KeyboardEventHandler from './KeyboardEventHandler.vue'
import DrawingTools from './DrawingTools.vue'
import { createMapEditorShellEventRelay } from '../composables/shell/useMapEditorShellEventRelay.js'

export default {
  name: 'MapEditorShell',
  components: { DrawingCanvas, PropertyPanel, KeyboardEventHandler, DrawingTools },
  props: {
    currentTool: { type: String, default: null },
    selectionMode: { type: String, default: 'single' },
    lineReverseEnabled: { type: Boolean, default: false },
    hasSelection: { type: Boolean, default: false },
    canUndo: { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false },
    points: { type: Array, default: () => [] },
    lines: { type: Array, default: () => [] },
    bsplines: { type: Array, default: () => [] },
    texts: { type: Array, default: () => [] },
    areas: { type: Array, default: () => [] },
    selectedPoints: { type: Array, default: () => [] },
    selectedLines: { type: Array, default: () => [] },
    selectedTexts: { type: Array, default: () => [] },
    selectedAreas: { type: Array, default: () => [] },
    bsplineParams: { type: Object, default: () => ({}) }
  },
  emits: [
    'canvas-ready',
    'tool-change', 'selection-mode-change', 'reverse-toggle-change', 'perform-alignment',
    'upload-map', 'upload-to-server', 'save-local', 'fit-view', 'reset-view',
    'delete-selected', 'undo', 'clear-mode', 'shift-pressed', 'shift-released',
    'point-added', 'point-selected', 'line-selected', 'line-created',
    'selection-changed',
    'bspline-created', 'bspline-anchor-drag-end',
    'text-added', 'text-selected',
    'area-created', 'area-anchor-drag-end', 'area-selected',
    'show-context-menu', 'drag-start', 'move-completed', 'show-toast',
    'update-point', 'update-line', 'update-text', 'update-curve', 'update-area',
    'element-selection',
    'element-focus'
  ],
  data() {
    return {
      propertyPanelCollapsed: true,
      propertyPanelWidth: '320px',
      propertyPanelCollapsedWidth: '0px',
      drawingToolsListeners: {},
      keyboardListeners: {},
      drawingCanvasListeners: {},
      propertyPanelListeners: {},
      relayElementSelection: () => {},
      relayElementFocus: () => {}
    }
  },
  methods: {
    togglePropertyPanel() {
      this.propertyPanelCollapsed = !this.propertyPanelCollapsed
    }
  },
  created() {
    const relay = createMapEditorShellEventRelay(this.$emit.bind(this))
    this.drawingToolsListeners = relay.drawingToolsListeners
    this.keyboardListeners = relay.keyboardListeners
    this.drawingCanvasListeners = relay.drawingCanvasListeners
    this.propertyPanelListeners = relay.propertyPanelListeners
    this.relayElementSelection = relay.relayElementSelection
    this.relayElementFocus = relay.relayElementFocus
  },
  mounted() {
    this.$emit('canvas-ready', this.$refs.drawingCanvas)
  }
}
</script>

<style scoped>
.editor-shell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
}

.property-panel-container {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  transition: width 0.28s ease;
  width: var(--panel-width, 320px);
  min-width: 0;
}
.property-panel-container.collapsed {
  width: var(--panel-collapsed-width, 0px) !important;
}

.panel-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(17,24,39,0.88);
  color: #e6eef8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(2,6,23,0.45);
  z-index: 60;
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}
.panel-toggle:hover {
  transform: translateY(-50%) scale(1.05);
  background: rgba(17,24,39,0.98);
}
.panel-toggle:focus { outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,0.18); }
.panel-toggle-icon {
  display: inline-block;
  transform: rotate(0deg);
  transition: transform 0.2s ease;
  font-size: 14px;
}
.panel-toggle-icon.collapsed {
  transform: rotate(180deg);
}

/* 给按钮增加较大的点击区域在移动端/触控板上更好点中 */
.panel-toggle::after {
  content: '';
  position: absolute;
  inset: -6px;
}
</style>
