<template>
  <div class="app-feedback-layer">
    <PointTypeContextMenu
      :visible="contextMenuVisible"
      :position="contextMenuPosition"
      :selected-point="contextMenuSelectedPoint"
      @change-point-type="$emit('change-point-type', $event)"
      @menu-action="$emit('context-menu-action', $event)"
      @close="$emit('close-context-menu')"
    />

    <LoadingProgress
      :visible="isLoading"
      :progress="loadingProgress"
      :status="loadingStatus"
      :loaded-count="loadedCount"
      :estimated-time="estimatedTime"
      @cancel="$emit('cancel-loading')"
    />

    <ToastNotification
      :visible="toastVisible"
      :type="toastType"
      :title="toastTitle"
      :message="toastMessage"
      :duration="toastDuration"
      :position="toastPosition"
      @close="$emit('close-toast')"
    />
  </div>
</template>

<script>
import PointTypeContextMenu from './PointTypeContextMenu.vue'
import LoadingProgress from './LoadingProgress.vue'
import ToastNotification from './ToastNotification.vue'

export default {
  name: 'AppFeedbackLayer',
  components: { PointTypeContextMenu, LoadingProgress, ToastNotification },
  props: {
    contextMenuVisible: { type: Boolean, default: false },
    contextMenuPosition: { type: Object, default: () => ({ x: 0, y: 0 }) },
    contextMenuSelectedPoint: { type: Object, default: null },

    isLoading: { type: Boolean, default: false },
    loadingProgress: { type: Number, default: 0 },
    loadingStatus: { type: String, default: '' },
    loadedCount: { type: Number, default: 0 },
    estimatedTime: { type: Number, default: 0 },

    toastVisible: { type: Boolean, default: false },
    toastType: { type: String, default: 'info' },
    toastTitle: { type: String, default: '' },
    toastMessage: { type: String, default: '' },
    toastDuration: { type: Number, default: 3000 },
    toastPosition: { type: Object, default: () => ({ top: 20, right: 20 }) }
  },
  emits: ['change-point-type', 'context-menu-action', 'close-context-menu', 'cancel-loading', 'close-toast']
}
</script>

<style scoped>
.app-feedback-layer {
  display: contents;
}
</style>
