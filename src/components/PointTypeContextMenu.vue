<template>
  <div 
    v-if="visible" 
    class="context-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <div class="menu-item" @click="changePointType('point')">
      <input 
        type="checkbox" 
        :checked="!selectedPoint?.type || selectedPoint?.type === 'point'"
        class="checkbox"
      >
      <span class="item-label">普通点</span>
    </div>
    <div class="menu-item" @click="changePointType('site')">
      <input 
        type="checkbox" 
        :checked="selectedPoint?.type === 'site'"
        class="checkbox"
      >
      <span class="item-label">🏭 站点</span>
    </div>
    <div class="menu-item" @click="changePointType('rest')">
      <input 
        type="checkbox" 
        :checked="selectedPoint?.type === 'rest'"
        class="checkbox"
      >
      <span class="item-label">🛏 休息点</span>
    </div>
    <div class="menu-item" @click="changePointType('charging')">
      <input 
        type="checkbox" 
        :checked="selectedPoint?.type === 'charging'"
        class="checkbox"
      >
      <span class="item-label">⚡ 充电点</span>
    </div>
    <div class="menu-item" @click="changePointType('escape')">
      <input 
        type="checkbox" 
        :checked="selectedPoint?.type === 'escape'"
        class="checkbox"
      >
      <span class="item-label">🚪 紧急出口</span>
    </div>
    <div class="menu-item" @click="changePointType('staging')">
      <input 
        type="checkbox" 
        :checked="selectedPoint?.type === 'staging'"
        class="checkbox"
      >
      <span class="item-label">📦 暂存站点</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PointTypeContextMenu',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    selectedPoint: {
      type: Object,
      default: null
    }
  },
  emits: ['change-point-type', 'close'],
  methods: {
    changePointType(type) {
      this.$emit('change-point-type', type)
      this.$emit('close')
    },
    
    // 点击外部关闭菜单
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.$emit('close')
      }
    }
  },
  mounted() {
    // 添加全局点击事件监听
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    // 移除全局点击事件监听
    document.removeEventListener('click', this.handleClickOutside)
  }
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 10000;
  min-width: 160px;
  padding: 4px 0;
  user-select: none;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  color: #ffffff;
  font-size: 14px;
}

.menu-item:hover {
  background: rgba(66, 153, 225, 0.2);
}

.checkbox {
  width: 16px;
  height: 16px;
  margin-right: 12px;
  accent-color: #4299e1;
  cursor: pointer;
}

.item-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 复选框样式 */
input[type="checkbox"] {
  appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid #4a5568;
  border-radius: 3px;
  background: transparent;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

input[type="checkbox"]:checked {
  background: #4299e1;
  border-color: #4299e1;
}

input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  top: -2px;
  left: 2px;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

input[type="checkbox"]:hover {
  border-color: #4299e1;
}
</style>
