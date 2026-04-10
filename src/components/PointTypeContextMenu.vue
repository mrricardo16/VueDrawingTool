<template>
  <div 
    v-if="visible" 
    class="context-menu"
    :style="menuStyle"
    @click.stop
  >
    <div class="menu-title">点类型</div>
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
      <span class="item-label">站点</span>
    </div>
    <div class="menu-item" @click="changePointType('rest')">
      <input 
        type="checkbox" 
        :checked="selectedPoint?.type === 'rest'"
        class="checkbox"
      >
      <span class="item-label">休息点</span>
    </div>
    <div class="menu-item" @click="changePointType('charging')">
      <input 
        type="checkbox" 
        :checked="selectedPoint?.type === 'charging'"
        class="checkbox"
      >
      <span class="item-label">充电点</span>
    </div>
    <div class="menu-item" @click="changePointType('escape')">
      <input 
        type="checkbox" 
        :checked="selectedPoint?.type === 'escape'"
        class="checkbox"
      >
      <span class="item-label">紧急出口</span>
    </div>
    <div class="menu-item" @click="changePointType('staging')">
      <input 
        type="checkbox" 
        :checked="selectedPoint?.type === 'staging'"
        class="checkbox"
      >
      <span class="item-label">暂存站点</span>
    </div>

    <div class="menu-divider"></div>
    <div class="menu-title">动作</div>

    <div class="menu-item" @click="emitAction('disable-init')">
      <input type="checkbox" :checked="selectedPoint?.fields?.no_reset === 'true'" class="checkbox">
      <span class="item-label">禁用初始化</span>
    </div>
    <div class="menu-item" @click="emitAction('set-loopid')">
      <input type="checkbox" :checked="!!selectedPoint?.fields?.loopid" class="checkbox">
      <span class="item-label">设置loopid</span>
    </div>
    <div class="menu-item" @click="emitAction('set-heights')">
      <input type="checkbox" :checked="!!selectedPoint?.fields?.heights" class="checkbox">
      <span class="item-label">设置楼层</span>
    </div>
    <div class="menu-item" @click="emitAction('enable-inter-action')">
      <input type="checkbox" :checked="selectedPoint?.fields?.interAction === 'true'" class="checkbox">
      <span class="item-label">启用进入请求</span>
    </div>
    <div class="menu-item" @click="emitAction('enable-leave-action')">
      <input type="checkbox" :checked="selectedPoint?.fields?.leaveAction === 'true'" class="checkbox">
      <span class="item-label">启用离开请求</span>
    </div>
    <div class="menu-item" @click="emitAction('disable-no-block')">
      <input type="checkbox" :checked="selectedPoint?.fields?.no_block === 'true'" class="checkbox">
      <span class="item-label">禁用任务中断</span>
    </div>
    <div class="menu-item" @click="emitAction('set-priority')">
      <input type="checkbox" :checked="!!selectedPoint?.fields?.priority" class="checkbox">
      <span class="item-label">设置优先级</span>
    </div>
    <div class="menu-item" @click="emitAction('set-change-pos')">
      <input type="checkbox" :checked="selectedPoint?.fields?.actionChangePos === 'true'" class="checkbox">
      <span class="item-label">设置自由线段目的点</span>
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
  emits: ['change-point-type', 'menu-action', 'close'],
  data() {
    return {
      renderX: 0,
      renderY: 0,
      edgePadding: 8
    }
  },
  computed: {
    menuStyle() {
      return {
        left: this.renderX + 'px',
        top: this.renderY + 'px'
      }
    }
  },
  watch: {
    visible(val) {
      if (val) this.$nextTick(this.adjustPosition)
    },
    position: {
      deep: true,
      handler() {
        if (this.visible) this.$nextTick(this.adjustPosition)
      }
    }
  },
  methods: {
    changePointType(type) {
      this.$emit('change-point-type', type)
      this.$emit('close')
    },
    emitAction(action) {
      this.$emit('menu-action', action)
      this.$emit('close')
    },

    adjustPosition() {
      const vw = window.innerWidth || document.documentElement.clientWidth
      const vh = window.innerHeight || document.documentElement.clientHeight

      let x = this.position?.x ?? 0
      let y = this.position?.y ?? 0

      const menuW = this.$el?.offsetWidth || 220
      const menuH = this.$el?.offsetHeight || 360

      const maxX = Math.max(this.edgePadding, vw - menuW - this.edgePadding)
      const maxY = Math.max(this.edgePadding, vh - menuH - this.edgePadding)

      this.renderX = Math.min(Math.max(this.edgePadding, x), maxX)
      this.renderY = Math.min(Math.max(this.edgePadding, y), maxY)
    },
    
    // 点击外部关闭菜单
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.$emit('close')
      }
    },

    handleWindowResize() {
      if (this.visible) this.$nextTick(this.adjustPosition)
    }
  },
  mounted() {
    // 添加全局点击事件监听
    document.addEventListener('click', this.handleClickOutside)
    window.addEventListener('resize', this.handleWindowResize)
  },
  beforeUnmount() {
    // 移除全局点击事件监听
    document.removeEventListener('click', this.handleClickOutside)
    window.removeEventListener('resize', this.handleWindowResize)
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
  min-width: 220px;
  max-height: calc(100vh - 16px);
  overflow: auto;
  padding: 4px 0;
  user-select: none;
}

.menu-title {
  font-size: 12px;
  color: #a0aec0;
  padding: 4px 16px;
}

.menu-divider {
  height: 1px;
  background: #4a5568;
  margin: 4px 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  color: #ffffff;
  font-size: 12px;
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
