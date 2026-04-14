<template>
  <div class="properties-detail">
    <div v-if="!hasSelection" class="no-selection">
      <p>请选择一个文本查看详细属性</p>
    </div>
    
    <div v-else class="property-section">
      <TabNavigation 
        :tabs="textTabs" 
        :active-tab="activeTab"
        @tab-change="activeTab = $event"
      />
      
      <div class="mini-tab-content">
        <!-- 属性标签页 -->
        <div v-if="activeTab === 'properties'" class="properties-content">
          <div v-for="text in selectedTextsData" :key="text.id" class="property-item">
            <div class="property-group">
              <label>序号:</label>
              <input v-model="text.id" type="text" readonly class="readonly-input">
            </div>
            <div class="property-group">
              <label>名字:</label>
              <textarea v-model="text.name" @change="updateText(text)" class="editable-textarea" rows="2"></textarea>
            </div>
            <div class="property-group">
              <label>X坐标:</label>
              <input v-model.number="text.x" @change="updateText(text)" type="number" step="0.1" class="editable-input">
            </div>
            <div class="property-group">
              <label>Y坐标:</label>
              <input v-model.number="text.y" @change="updateText(text)" type="number" step="0.1" class="editable-input">
            </div>
            <div class="property-group">
              <label>颜色:</label>
              <input v-model="text.color" @change="updateText(text)" type="color" class="editable-input">
            </div>
            <div class="property-group">
              <label>字体大小:</label>
              <input v-model.number="text.fontSize" @change="updateText(text)" type="number" step="1" class="editable-input">
            </div>
            <div class="property-group">
              <label>角度:</label>
              <input v-model.number="text.angle" @change="updateText(text)" type="number" step="0.1" class="editable-input">
            </div>
            <div class="property-group">
              <label>图层:</label>
              <input :value="text.layerId || text.layerIds?.[0]" @input="updateTextLayer(text, $event.target.value)" type="text" class="editable-input">
            </div>
          </div>
        </div>
        
        <!-- 状态标签页（已移除） -->
        
        <!-- 动作标签页 -->
        <div v-else-if="activeTab === 'actions'" class="actions-content">
          <div class="action-buttons">
            <button class="mini-action-btn" disabled>复制文本</button>
            <button class="mini-action-btn" disabled>删除文本</button>
            <button class="mini-action-btn" disabled>重置属性</button>
            <button class="mini-action-btn" disabled>导出数据</button>
          </div>
          <div class="action-notice">
            <small>功能待实现...</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TabNavigation from './TabNavigation.vue'

export default {
  name: 'TextProperties',
  components: {
    TabNavigation
  },
  props: {
    selectedTexts: {
      type: Array,
      default: () => []
    },
    texts: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update-text'],
  data() {
    return {
      activeTab: 'properties',
      textTabs: [
        { key: 'properties', label: '属性' },
        { key: 'actions', label: '动作' }
      ]
    };
  },
  computed: {
    hasSelection() {
      return this.selectedTexts.length === 1
    },
    selectedTextsData() {
      if (this.selectedTexts.length === 1) {
        return this.selectedTexts.map(id => this.texts.find(t => t.id === id)).filter(Boolean)
      }
      return []
    }
  },
  methods: {
    updateText(text) {
      this.$emit('update-text', text)
    },
    
    updateTextLayer(text, layerValue) {
      // 更新图层信息
      if (Array.isArray(text.layerIds)) {
        text.layerIds = [layerValue]
      } else {
        text.layerId = layerValue
      }
      this.updateText(text)
    },
    
    // 注意：复制、删除、重置、导出功能待实现，暂时移除以减少冗余代码
  }
}
</script>

<style scoped>
@import url('./styles/shared-styles.css');

.properties-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  font-size: 12px;
}

.property-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mini-tab-content {
  flex: 1;
  overflow-y: auto;
  background: #374151;
}

.properties-content {
  padding: 12px;
}

.property-item {
  margin-bottom: 16px;
}

.property-group {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
}

.property-group label {
  width: 80px;
  color: #a0aec0;
  font-size: 12px;
  font-weight: 500;
  padding-top: 6px;
}

.readonly-input {
  flex: 1;
  padding: 6px 8px;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 4px;
  color: #a0aec0;
  font-size: 12px;
}

.editable-input,
.editable-select {
  flex: 1;
  padding: 6px 8px;
  background: #1a202c;
  border: 1px solid #4a5568;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 12px;
  transition: border-color 0.2s ease;
}

.editable-textarea {
  flex: 1;
  padding: 6px 8px;
  background: #1a202c;
  border: 1px solid #4a5568;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 12px;
  resize: vertical;
  min-height: 40px;
  transition: border-color 0.2s ease;
}

.editable-input:focus,
.editable-select:focus,
.editable-textarea:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 1px rgba(66, 153, 225, 0.3);
}

.status-content {
  padding: 12px;
}

.status-item {
  margin-bottom: 16px;
}

.status-info {
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  padding: 12px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #4a5568;
}

.status-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.status-label {
  color: #a0aec0;
  font-size: 12px;
  font-weight: 500;
}

.status-value {
  color: #e2e8f0;
  font-size: 12px;
}
</style>
