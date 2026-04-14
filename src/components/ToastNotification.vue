<template>
  <transition name="toast-fade">
    <div
      v-if="visible"
      class="toast-notification"
      :class="type"
      :style="{ top: position.top + 'px', right: position.right + 'px' }"
    >
      <div class="toast-icon">
        <svg v-if="type === 'error'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <svg v-else-if="type === 'warning'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <svg v-else-if="type === 'success'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="toast-content">
        <div class="toast-title">{{ title }}</div>
        <div v-if="message" class="toast-message">{{ message }}</div>
      </div>
      <button class="toast-close" @click="close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/>
        </svg>
      </button>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'ToastNotification',
  props: {
    visible: { type: Boolean, default: false },
    type: { type: String, default: 'error' }, // error, warning, success
    title: { type: String, default: '提示' },
    message: { type: String, default: '' },
    duration: { type: Number, default: 3000 },
    position: { type: Object, default: () => ({ top: 20, right: 20 }) }
  },
  data() {
    return {
      timer: null
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.startTimer()
      } else {
        this.clearTimer()
      }
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    startTimer() {
      if (this.duration > 0) {
        this.timer = setTimeout(() => {
          this.close()
        }, this.duration)
      }
    },
    clearTimer() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    }
  },
  beforeUnmount() {
    this.clearTimer()
  }
}
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.toast-notification {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  min-width: 300px;
  max-width: 500px;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.toast-notification.error {
  border-left-color: #ef4444;
}

.toast-notification.warning {
  border-left-color: #f59e0b;
}

.toast-notification.success {
  border-left-color: #10b981;
}

.toast-icon {
  flex-shrink: 0;
  margin-right: 12px;
  margin-top: 2px;
}

.toast-notification.error .toast-icon {
  color: #ef4444;
}

.toast-notification.warning .toast-icon {
  color: #f59e0b;
}

.toast-notification.success .toast-icon {
  color: #10b981;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 12px;
  line-height: 1.4;
  color: #111827;
  margin-bottom: 2px;
}

.toast-message {
  font-size: 12px;
  line-height: 1.4;
  color: #6b7280;
  word-wrap: break-word;
}

.toast-close {
  flex-shrink: 0;
  margin-left: 12px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #9ca3af;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.toast-close:hover {
  background-color: #f3f4f6;
  color: #6b7280;
}

.toast-close:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .toast-notification {
    background: #1f2937;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toast-title {
    color: #f9fafb;
  }

  .toast-message {
    color: #d1d5db;
  }

  .toast-close {
    color: #6b7280;
  }

  .toast-close:hover {
    background-color: #374151;
    color: #9ca3af;
  }
}
</style>
