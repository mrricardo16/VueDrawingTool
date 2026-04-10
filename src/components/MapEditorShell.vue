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

      <div class="property-panel-container">
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
          @element-selection="relayElementSelection"
          @element-focus="relayElementFocus"
        />
      </div>
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
      drawingToolsListeners: {},
      keyboardListeners: {},
      drawingCanvasListeners: {},
      propertyPanelListeners: {},
      relayElementSelection: () => {},
      relayElementFocus: () => {}
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
  width: 20%;
  min-width: 250px;
  max-width: 400px;
  height: 100%;
  flex-shrink: 0;
}
</style>
