<template>
  <div
    :class="[
      'tool-button-container',
      {
        active: isActive,
        'has-dropdown': hasDropdown,
        compact: compact,
        'dropdown-open': showDropdown,
      },
    ]"
  >
    <!-- 主工具按钮 -->
    <button
      :class="['tool-btn', { active: isActive }]"
      :title="tool.name"
      @mousedown.stop
      @mouseup.stop
      @click.stop="handleClick"
    >
      <span class="tool-icon">
        <img v-if="isImageIcon(tool.icon)" :src="tool.icon" :alt="tool.name" class="tool-icon-img" />
        <span v-else>{{ tool.icon }}</span>
      </span>
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
import { computed } from "vue";
import { useToolButtonDropdown } from "../composables/useToolButtonDropdown.js";

export default {
  name: "ToolButton",
  props: {
    tool: {
      type: Object,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    compact: {
      type: Boolean,
      default: false,
    },
    dropdownConfig: {
      type: Object,
      default: null,
    },
  },
  emits: ["click", "dropdown-action"],
  setup(props) {
    const dropdownConfigRef = computed(() => props.dropdownConfig);
    const {
      showDropdown,
      hasDropdown,
      dropdownTitle,
      dropdownItems,
      toggleDropdown,
      closeDropdown,
      handleClickOutside,
    } = useToolButtonDropdown(dropdownConfigRef, () => null);

    return {
      showDropdown,
      hasDropdown,
      dropdownTitle,
      dropdownItems,
      toggleDropdown,
      closeDropdown,
      handleClickOutside,
    };
  },
  mounted() {
    // 点击外部关闭下拉菜单
    document.addEventListener("click", this.handleClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener("click", this.handleClickOutside);
  },
  methods: {
    isImageIcon(icon) {
      return (
        typeof icon === "string" &&
        (icon.startsWith("http") ||
          icon.startsWith("/") ||
          icon.startsWith("data:image/") ||
          icon.endsWith(".png") ||
          icon.endsWith(".jpg") ||
          icon.endsWith(".jpeg") ||
          icon.endsWith(".svg"))
      );
    },
    handleClick() {
      if (this.hasDropdown && this.tool?.clickMode === "toggle-dropdown") {
        this.toggleDropdown();
        return;
      }
      this.$emit("click", this.tool.id);
    },
    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    handleDropdownAction(item) {
      this.$emit("dropdown-action", {
        toolId: this.tool.id,
        action: item.value,
        item: item,
      });
      if (!item?.keepOpen) {
        this.closeDropdown();
      }
    },
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.closeDropdown();
      }
    },
  },
};
</script>

<style scoped>
.tool-button-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 2px;
  margin: 0;
  transition: all 0.18s ease;
}

.tool-button-container.dropdown-open {
  z-index: 1250;
}

.tool-button-container:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(3, 10, 18, 0.16);
}

.tool-button-container.active {
  /* Purple active style: #7C3AED -> #5B21B6 */
  background: linear-gradient(180deg, rgba(124, 58, 237, 0.18) 0%, rgba(91, 33, 182, 0.78) 100%);
  border-color: rgba(124, 58, 237, 0.72);
  box-shadow:
    0 14px 36px rgba(91, 33, 182, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transform: translateY(-2px);
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
  color: #e6eef8;
  padding: 2px;
  height: 52px;
  min-height: 52px;
  cursor: pointer;
  transition: transform 0.14s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  min-width: 40px;
  flex: 0 0 auto;
}

.tool-btn:hover {
  background: rgba(99, 179, 237, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(15, 30, 60, 0.14);
}

.tool-btn.active {
  /* Remove inner rectangle: keep text color but let outer container provide the active background */
  background: transparent;
  color: #ffffff;
  border: none;
  box-shadow: none;
}

.tool-button-container.compact .tool-btn {
  padding: 6px 6px;
  height: 52px;
  min-height: 52px;
  font-size: 11px;
  justify-content: center;
}

.tool-icon {
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  display: block;
  margin: 0 auto;
}

.tool-button-container.compact .tool-icon {
  font-size: 12px;
}

.tool-icon-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  display: block;
}

.tool-button-container {
  min-width: 0;
}

.tool-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #dbeafe;
  line-height: 1;
  text-align: center;
  max-width: 80px;
}

.tool-button-container.active .tool-name {
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
}

.tool-button-container.active .tool-icon-img,
.tool-button-container.active .tool-icon span {
  /* keep svg/text icons bright */
  color: #ffffff;
}

.tool-button-container.active .tool-icon-img {
  filter: drop-shadow(0 6px 12px rgba(91, 33, 182, 0.22));
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
  padding: 0 8px;
  height: 52px;
  min-height: 52px;
  cursor: pointer;
  font-size: 12px;
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
  padding: 0 6px;
  height: 52px;
  min-height: 52px;
  font-size: 12px;
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
  font-size: 12px;
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
