<template>
  <div class="layer-dropdown" :class="{ open: isOpen }">
    <button
      class="layer-button"
      title="图层"
      @mousedown.stop
      @mouseup.stop
      @click.stop="toggleDropdown"
      :class="{ open: isOpen }"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
      </svg>
      图层
      <span class="arrow" :class="{ up: isOpen }">▼</span>
    </button>

    <div
      v-if="isOpen"
      class="dropdown-mask"
      @click.stop="handleMaskClick"
    ></div>

    <div v-if="isOpen" class="dropdown-menu" @click.stop @mousedown.stop @mouseup.stop>
      <div class="layer-list">
        <div
          v-for="layer in layers"
          :key="layer.id"
          class="layer-item"
          @click.stop="toggleLayerVisibility(layer.id)"
        >
          <input
            type="checkbox"
            :checked="layer.visible"
            @click.stop="toggleLayerVisibility(layer.id)"
            class="layer-checkbox"
          />
          <span class="layer-name" :class="{ 'is-default': layer.id === 'g' }">
            {{ layer.name }}
          </span>
        </div>
      </div>

      <div class="divider"></div>

      <button class="add-layer-btn" @click.stop="showAddLayerDialog">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        新增图层
      </button>
    </div>

    <div v-if="showDialog" class="dialog-overlay" @click="closeDialog">
      <div class="dialog" @click.stop>
        <h3>新增图层</h3>
        <input
          v-model="newLayerName"
          ref="layerNameInput"
          type="text"
          placeholder="请输入图层名称"
          @keyup.enter="addLayer"
          @keyup.esc="closeDialog"
          class="layer-name-input"
        />
        <div class="dialog-buttons">
          <button @click="closeDialog" class="cancel-btn">取消</button>
          <button @click="addLayer" class="confirm-btn" :disabled="!newLayerName.trim()">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useLayerStore } from '../stores/layerStore'
import { storeToRefs } from 'pinia'
import { useLayerDropdown } from '../composables/useLayerDropdown'

export default {
  name: 'LayerDropdown',
  setup() {
    const layerStore = useLayerStore()
    const { layers } = storeToRefs(layerStore)
    const {
      isOpen,
      showDialog,
      newLayerName,
      layerNameInput,
      toggleDropdown,
      toggleLayerVisibility,
      showAddLayerDialog,
      closeDialog,
      addLayer,
      handleClickOutside
    } = useLayerDropdown(layerStore)

    return {
      isOpen, showDialog, newLayerName, layerNameInput, layers,
      toggleDropdown, toggleLayerVisibility,
      showAddLayerDialog, closeDialog, addLayer, handleClickOutside,
    }
  },
  mounted()      { document.addEventListener('click', this.handleClickOutside) },
  beforeUnmount(){ document.removeEventListener('click', this.handleClickOutside) },
  methods: {
    handleMaskClick() {
      this.isOpen = false
    }
  }
}
</script>

<style scoped>
.layer-dropdown { position: relative; display: inline-block; }

.layer-dropdown.open { z-index: 1220; }

.dropdown-mask {
  position: fixed;
  inset: 0;
  z-index: 1210;
  background: transparent;
  pointer-events: auto;
}

.layer-button {
  /* match the look of tool buttons that have dropdowns */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  height: 52px;
  min-height: 52px;
  min-width: 40px;
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  color: #dbeafe;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.12s ease;
}
.layer-button:hover, .layer-button.open {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(15, 30, 60, 0.14);
}

.layer-button svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.layer-button .arrow {
  margin-left: 6px;
  padding-left: 6px;
  border-left: 1px solid rgba(255,255,255,0.08);
  display: inline-flex;
  align-items: center;
}

.layer-button.open {
  background: linear-gradient(180deg, rgba(124,58,237,0.12), rgba(91,33,182,0.18));
  color: #ffffff;
  border-color: rgba(91,33,182,0.24);
}

.arrow { font-size: 12px; transition: transform 0.2s; }
.arrow.up { transform: rotate(180deg); }

.dropdown-menu {
  position: absolute; top: 100%; left: 0; margin-top: 4px;
  background: #2c3e50; border: 1px solid #34495e; border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,.3);
  min-width: 160px; max-width: 240px; z-index: 1211;
  pointer-events: auto;
}

.layer-list { max-height: 300px; overflow-y: auto; }

.layer-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; cursor: pointer; transition: background 0.15s;
  font-size: 11px;
}
.layer-item:hover { background: #34495e; }

.layer-checkbox { width: 16px; height: 16px; flex-shrink: 0; accent-color: #3498db; cursor: pointer; }

.layer-name { flex: 1; color: #ecf0f1; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.layer-name.is-default { font-weight: bold; color: #3498db; }

.divider { height: 1px; background: #34495e; margin: 4px 0; }

.add-layer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  height: 40px;
  min-height: 40px;
  background: transparent;
  border: none;
  color: #ecf0f1;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}
.add-layer-btn:hover { background: rgba(255, 255, 255, 0.08); }

.dialog-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.dialog {
  background: #2c3e50; border: 1px solid #34495e; border-radius: 6px;
  padding: 20px; min-width: 300px; box-shadow: 0 8px 24px rgba(0,0,0,.4);
}
.dialog h3 { margin: 0 0 16px; color: #ecf0f1; font-size: 12px; }
.layer-name-input {
  width: 100%; padding: 8px 12px; background: #34495e; border: 1px solid #4a5f7a;
  border-radius: 4px; color: #ecf0f1; font-size: 12px; margin-bottom: 16px; box-sizing: border-box;
}
.layer-name-input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.2); }
.dialog-buttons { display: flex; gap: 12px; justify-content: flex-end; }
.cancel-btn {
  padding: 6px 16px; background: #7f8c8d; border: none; border-radius: 4px;
  color: white; cursor: pointer; font-size: 12px; transition: background 0.15s;
}
.cancel-btn:hover { background: #95a5a6; }
.confirm-btn {
  padding: 6px 16px; background: #3498db; border: none; border-radius: 4px;
  color: white; cursor: pointer; font-size: 12px; transition: background 0.15s;
}
.confirm-btn:hover:not(:disabled) { background: #2980b9; }
.confirm-btn:disabled { background: #7f8c8d; cursor: not-allowed; }
</style>
