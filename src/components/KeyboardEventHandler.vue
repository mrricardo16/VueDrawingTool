<template>
  <div class="keyboard-event-handler">
    <!-- 这个组件只处理键盘事件，不渲染任何内容 -->
  </div>
</template>

<script>
import {
  createKeyboardShortcutHandlers,
  bindKeyboardEvents,
  unbindKeyboardEvents
} from '../composables/keyboard/keyboardShortcuts.js'

export default {
  name: 'KeyboardEventHandler',
  props: {
    selectedPoints: {
      type: Array,
      default: () => []
    },
    selectedLines: {
      type: Array,
      default: () => []
    },
    selectedTexts: {
      type: Array,
      default: () => []
    }
  },
  emits: ['undo', 'points-deleted', 'clear-mode', 'shift-pressed', 'shift-released'],
  data() {
    return {
      isShiftPressed: false
    }
  },
  mounted() {
    this.setupKeyboardEvents()
  },
  beforeUnmount() {
    this.cleanupKeyboardEvents()
  },
  methods: {
    setupKeyboardEvents() {
      const { handleKeyDown, handleKeyUp } = createKeyboardShortcutHandlers({
        onUndo: () => this.$emit('undo'),
        onDelete: () => this.$emit('points-deleted'),
        onClearMode: () => this.$emit('clear-mode'),
        onShiftPressed: () => this.$emit('shift-pressed'),
        onShiftReleased: () => this.$emit('shift-released'),
        onShiftStateChange: (pressed) => {
          this.isShiftPressed = pressed
        }
      })

      this.handleKeyDown = handleKeyDown
      this.handleKeyUp = handleKeyUp
      bindKeyboardEvents(this.handleKeyDown, this.handleKeyUp)
    },

    cleanupKeyboardEvents() {
      unbindKeyboardEvents(this.handleKeyDown, this.handleKeyUp)
    }
  }
}
</script>

<style scoped>
.keyboard-event-handler {
  display: none;
}
</style>
