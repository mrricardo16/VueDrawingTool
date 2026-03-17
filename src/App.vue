<template>
  <div class="app">
    <MapEditorShell
      :current-tool="currentTool"
      :selection-mode="selectionMode"
      :has-selection="hasSelection"
      :can-undo="canUndo"
      :is-loading="isLoading"
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
      v-on="mapEditorShellListeners"
    />

    <AppFeedbackLayer
      :context-menu-visible="contextMenuVisible"
      :context-menu-position="contextMenuPosition"
      :context-menu-selected-point="contextMenuSelectedPoint"
      :is-loading="isLoading"
      :loading-progress="loadingProgress"
      :loading-status="loadingStatus"
      :loaded-count="loadedCount"
      :estimated-time="estimatedTime"
      :toast-visible="toastVisible"
      :toast-type="toastType"
      :toast-title="toastTitle"
      :toast-message="toastMessage"
      :toast-duration="toastDuration"
      :toast-position="toastPosition"
      v-on="appFeedbackListeners"
    />

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="mapStore.handleFileSelected"
    />

  </div>
</template>

<script>
import MapEditorShell from './components/MapEditorShell.vue'
import AppFeedbackLayer from './components/AppFeedbackLayer.vue'

import { useAppFacade } from './composables/app/useAppFacade.js'

export default {
  name: 'App',
  components: {
    MapEditorShell, AppFeedbackLayer
  },
  setup() {
    return useAppFacade()
  }
}
</script>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }

.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #1a1a1a;
}
</style>
