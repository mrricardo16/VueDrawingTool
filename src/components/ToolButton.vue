<template>
  <div 
    :class="['tool-button-container', { 
      active: isActive,
      'has-dropdown': hasDropdown,
      compact: compact,
      'dropdown-open': showDropdown
    }]"
  >
    <!-- 主工具按钮 -->
    <button 
      :class="['tool-btn', { active: isActive }]"
      @mousedown.stop
      @mouseup.stop
      @click.stop="handleClick"
      :title="compact ? tool.name : ''"
    >
      <span class="tool-icon">{{ tool.icon }}</span>
      <span v-if="!compact" class="tool-name">{{ tool.name }}</span>
    </button>
    
    <!-- 下拉菜单 -->
    <div v-if="hasDropdown" class="dropdown">
      <button 
        class="dropdown-toggle"
        @mousedown.stop
        @mouseup.stop
        @click.stop="toggleDropdown"
        :title="dropdownTitle"
      >
        ▼
      </button>
      <div
        v-if="showDropdown"
        class="dropdown-overlay"
        @mousedown.stop
        @mouseup.stop
        @click.stop="closeDropdown"
      ></div>
      <div 
        v-if="showDropdown" 
        class="dropdown-menu"
        @click.stop
        @mousedown.stop
        @mouseup.stop
      >
        <div 
          v-for="item in dropdownItems" 
          :key="item.value"
          :class="['dropdown-item', { active: item.active }]"
          @mousedown.stop
          @mouseup.stop
          @click.stop="handleDropdownAction(item)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useToolButtonDropdown } from '../composables/useToolButtonDropdown.js'

export default {
  name: 'ToolButton',
  props: {
    tool: {
      type: Object,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    compact: {
      type: Boolean,
      default: false
    },
    dropdownConfig: {
      type: Object,
      default: null
    }
  },
  emits: ['click', 'dropdown-action'],
  setup(props) {
    const dropdownConfigRef = computed(() => props.dropdownConfig)
    const {
      showDropdown,
      hasDropdown,
      dropdownTitle,
      dropdownItems,
      toggleDropdown,
      closeDropdown,
      handleClickOutside
    } = useToolButtonDropdown(dropdownConfigRef, () => null)

    return {
      showDropdown,
      hasDropdown,
      dropdownTitle,
      dropdownItems,
      toggleDropdown,
      closeDropdown,
      handleClickOutside
    }
  },
  mounted() {
    // 点击外部关闭下拉菜单
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    handleClick() {
      if (this.hasDropdown && this.tool?.clickMode === 'toggle-dropdown') {
        this.toggleDropdown()
        return
      }
      this.$emit('click', this.tool.id)
    },
    toggleDropdown() {
      this.showDropdown = !this.showDropdown
    },
    handleDropdownAction(item) {
      this.$emit('dropdown-action', {
        toolId: this.tool.id,
        action: item.value,
        item: item
      })
      this.closeDropdown()
    },
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.closeDropdown()
      }
    }
  }
}
</script>

<style scoped>
.tool-button-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.tool-button-container.dropdown-open {
  z-index: 1250;
}

.tool-button-container:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.tool-button-container.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.tool-button-container.has-dropdown {
  padding-right: 0;
}

.tool-button-container.compact {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.tool-button-container.compact:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tool-btn {
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  min-width: 0;
  flex: 1;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: none;
  box-shadow: none;
}

.tool-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.tool-button-container.compact .tool-btn {
  padding: 8px 10px;
  font-size: 16px;
  justify-content: center;
}

.tool-icon {
  font-size: 18px;
  line-height: 1;
}

.tool-button-container.compact .tool-icon {
  font-size: 20px;
}

.tool-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown {
  position: relative;
  display: flex;
  align-items: center;
}

.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 1240;
  background: transparent;
  pointer-events: auto;
}

.dropdown-toggle {
  background: transparent;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  padding: 12px 8px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  flex-shrink: 0;
}

.dropdown-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  border-left-color: rgba(255, 255, 255, 0.5);
}

.tool-button-container.active .dropdown-toggle {
  border-left-color: rgba(255, 255, 255, 0.5);
}

.tool-button-container.compact .dropdown-toggle {
  padding: 8px 6px;
  font-size: 8px;
  min-width: 20px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1241;
  min-width: 120px;
  overflow: hidden;
  pointer-events: auto;
}

.dropdown-item {
  padding: 10px 16px;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #4a5568;
  color: #ffffff;
}

.dropdown-item.active {
  background: #667eea;
  color: #ffffff;
}
</style>
