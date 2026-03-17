<template>
  <div class="property-panel">
    <div class="panel-header">
      <h3>属性面板</h3>
    </div>
    
    <!-- 上部分：所有元素统一列表 -->
    <ElementList
      :points="points"
      :lines="lines"
      :texts="texts"
      :bsplines="bsplines"
      :selected-points="selectedPoints"
      :selected-lines="selectedLines"
      :selected-texts="selectedTexts"
      @select-element="handleElementSelection"
      ref="elementList"
    />
    
    <!-- 下部分：选中元素详细属性 -->
    <div class="properties-detail">
      <component
        v-if="activeEditorComponent"
        :is="activeEditorComponent"
        v-bind="activeEditorProps"
        @update-point="handleUpdatePoint"
        @update-line="handleUpdateLine"
        @update-text="handleUpdateText"
        @update-area="$emit('update-area', $event)"
      />

      <!-- 多选或无选择提示 -->
      <div v-if="!activeEditorComponent" class="no-selection">
        <p v-if="hasMultipleSelection">请选择单个元素查看详细属性</p>
        <p v-else>请选择一个元素查看详细属性</p>
      </div>
    </div>
  </div>
</template>

<script>
import ElementList from './ElementList.vue'
import PointProperties from './PointProperties.vue'
import LineProperties from './LineProperties.vue'
import TextProperties from './TextProperties.vue'
import AreaProperties from './AreaProperties.vue'
import { resolveActiveEditorType, buildActiveEditorProps, hasMultipleSelection } from '../composables/usePropertyPanelEditor.js'

export default {
  name: 'PropertyPanel',
  components: {
    ElementList,
    PointProperties,
    LineProperties,
    TextProperties,
    AreaProperties
  },
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
    },
    points: {
      type: Array,
      default: () => []
    },
    lines: {
      type: Array,
      default: () => []
    },
    texts: {
      type: Array,
      default: () => []
    },
    bsplines: {
      type: Array,
      default: () => []
    },
    areas: {
      type: Array,
      default: () => []
    },
    selectedAreas: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update-point', 'update-line', 'update-text', 'update-curve', 'update-area', 'element-selection'],
  computed: {
    activeEditorType() {
      return resolveActiveEditorType({
        selectedPoints: this.selectedPoints,
        selectedLines: this.selectedLines,
        selectedTexts: this.selectedTexts,
        selectedAreas: this.selectedAreas
      })
    },
    activeEditorComponent() {
      const map = {
        point: PointProperties,
        line: LineProperties,
        text: TextProperties,
        area: AreaProperties
      }
      return this.activeEditorType ? map[this.activeEditorType] : null
    },
    activeEditorProps() {
      return buildActiveEditorProps(this.activeEditorType, {
        selectedPoints: this.selectedPoints,
        selectedLines: this.selectedLines,
        selectedTexts: this.selectedTexts,
        selectedAreas: this.selectedAreas,
        points: this.points,
        lines: this.lines,
        texts: this.texts,
        bsplines: this.bsplines,
        areas: this.areas
      })
    },
    hasMultipleSelection() {
      return hasMultipleSelection({
        selectedPoints: this.selectedPoints,
        selectedLines: this.selectedLines,
        selectedTexts: this.selectedTexts,
        selectedAreas: this.selectedAreas
      })
    }
  },
  methods: {
    handleElementSelection(type, ids) {
      this.$emit('element-selection', type, Array.isArray(ids) ? ids : [ids])
      
      // 滚动到选中的元素
      this.$nextTick(() => {
        if (this.$refs.elementList) {
          const elementId = Array.isArray(ids) ? ids[0] : ids
          this.$refs.elementList.scrollToElement(elementId)
        }
      })
    },
    
    handleUpdatePoint(point) {
      this.$emit('update-point', point)
    },
    
    handleUpdateLine(line) {
      this.$emit('update-line', line)
    },
    
    handleUpdateText(text) {
      this.$emit('update-text', text)
    }
  }
}
</script>

<style scoped>
@import url('./styles/shared-styles.css');
.property-panel {
  width: 100%;
  height: 100%;
  background: #2d3748;
  border-left: 1px solid #4a5568;
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #1a202c;
  border-bottom: 1px solid #4a5568;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  color: #e2e8f0;
  font-size: 14px;
}

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
  font-size: 11px;
  text-align: center;
  padding: 20px;
}

.readonly-input {
  background: #1f2937;
  border: 1px solid #374151;
  color: #6b7280;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  flex: 1;
}

.editable-input {
  background: #1f2937;
  border: 1px solid #4b5563;
  color: #e2e8f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  flex: 1;
}

.editable-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.editable-select {
  background: #1f2937;
  border: 1px solid #4b5563;
  color: #e2e8f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  flex: 1;
}

.editable-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.editable-textarea {
  background: #1f2937;
  border: 1px solid #4b5563;
  color: #e2e8f0;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 11px;
  flex: 1;
  resize: vertical;
  min-height: 30px;
}

.editable-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}
</style>
