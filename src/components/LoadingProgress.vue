<template>
  <div v-if="visible" class="loading-overlay">
    <div class="loading-dialog">
      <div class="loading-header">
        <h3>正在加载地图...</h3>
      </div>
      <div class="loading-body">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: Math.min(100, Math.max(0, progress * 100)) + '%' }"
          ></div>
        </div>
        <div class="progress-text">
          {{ Math.min(100, Math.max(0, Math.round(progress * 100))) }}% - {{ status }}
        </div>
        <div class="loading-details">
          <div v-if="loadedCount > 0">
            已加载: {{ loadedCount }} 个元素
          </div>
          <div v-if="estimatedTime > 0">
            预计剩余时间: {{ estimatedTime }}秒
          </div>
        </div>
      </div>
      <div class="loading-footer">
        <button 
          v-if="allowCancel" 
          @click="handleCancel"
          class="cancel-btn"
        >
          取消加载
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingProgress',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: '准备中...'
    },
    loadedCount: {
      type: Number,
      default: 0
    },
    estimatedTime: {
      type: Number,
      default: 0
    },
    allowCancel: {
      type: Boolean,
      default: true
    }
  },
  emits: ['cancel'],
  methods: {
    handleCancel() {
      this.$emit('cancel')
    }
  }
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-dialog {
  background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.loading-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.loading-body {
  margin: 20px 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4299e1 0%, #667eea 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  color: #ffffff;
  font-size: 12px;
  text-align: center;
  margin-bottom: 16px;
}

.loading-details {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  text-align: center;
}

.loading-details div {
  margin: 4px 0;
}

.loading-footer {
  text-align: center;
}

.cancel-btn {
  background: rgba(239, 68, 68, 0.8);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: rgba(239, 68, 68, 1);
  transform: translateY(-1px);
}
</style>
