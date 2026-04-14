<template>
  <div class="properties-detail">
    <div v-if="!hasSelection" class="no-selection">
      <p>请选择一条线查看详细属性</p>
    </div>
    
    <div v-else class="property-section">
      <TabNavigation 
        :tabs="lineTabs" 
        :active-tab="activeTab"
        @tab-change="activeTab = $event"
      />
      
      <div class="mini-tab-content">
        <!-- 属性标签页 -->
        <div v-if="activeTab === 'properties'" class="properties-content">
          <div v-for="line in selectedLinesData" :key="line.id" class="property-item">
            <div class="property-group">
              <label>序号:</label>
              <input v-model="line.id" type="text" readonly class="readonly-input">
            </div>
            <div class="property-group">
              <label>名字:</label>
              <input v-model="line.name" @change="updateLine(line)" type="text" class="editable-input">
            </div>
            <div class="property-group">
              <label>起点ID:</label>
              <input v-model="line.startPointId" @change="updateLine(line)" type="text" class="editable-input">
            </div>
            <div class="property-group">
              <label>终点ID:</label>
              <input v-model="line.endPointId" @change="updateLine(line)" type="text" class="editable-input">
            </div>
            <div class="property-group">
              <label>模式:</label>
              <select v-model="line.mode" @change="updateLine(line)" class="editable-select">
                <option value="bidirectional">双向</option>
                <option value="single">单向</option>
              </select>
            </div>
            <div class="property-group">
              <label>颜色:</label>
              <input v-model="line.color" @change="updateLine(line)" type="color" class="editable-input">
            </div>
            <div class="property-group">
              <label>角度:</label>
              <input v-model.number="line.angle" @change="updateLine(line)" type="number" step="0.1" class="editable-input">
            </div>
            <div class="property-group">
              <label>图层:</label>
              <input :value="line.layerId || line.layerIds?.[0]" @input="updateLineLayer(line, $event.target.value)" type="text" class="editable-input">
            </div>
          </div>
        </div>
        
        <!-- 状态标签页（已移除） -->
        
        <!-- 动作标签页 -->
        <div v-else-if="activeTab === 'actions'" class="actions-content">
          <div v-for="line in selectedLinesData" :key="line.id" class="line-action-card">
            <div class="action-buttons vertical-list">
              <button class="mini-action-btn" @click="setJsonArrayField(line, 'conflicts', '设置冲突路线ID（逗号分隔）')">设置冲突路线</button>
              <button class="mini-action-btn" @click="setJsonArrayField(line, 'sconflicts', '设置冲突点ID（逗号分隔）')">设置冲突点</button>
              <button class="mini-action-btn" @click="setJsonArrayField(line, 'freeLineSites', '配置自由线段站点ID（逗号分隔）')">配置自由线段</button>
              <button class="mini-action-btn" @click="toggleTrackField(line, 'reverseDst', String(line.endPointId || line.siteB || ''))">设置倒车点</button>
              <button class="mini-action-btn" @click="setDefaultSwitchDef(line)">激光设置</button>
              <button class="mini-action-btn" @click="toggleTrackField(line, 'rotateid', 'true')">设置原地旋转</button>
              <button class="mini-action-btn" disabled>投影站点</button>
              <button class="mini-action-btn" disabled>二分路径</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TabNavigation from './TabNavigation.vue'

export default {
  name: 'LineProperties',
  components: {
    TabNavigation
  },
  props: {
    selectedLines: {
      type: Array,
      default: () => []
    },
    lines: {
      type: Array,
      default: () => []
    },
    bsplines: {
      type: Array,
      default: () => []
    },
    points: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update-line'],
  data() {
    return {
      activeTab: 'properties',
      lineTabs: [
        { key: 'properties', label: '属性' },
        { key: 'actions', label: '动作' }
      ]
    };
  },
  computed: {
    hasSelection() {
      return this.selectedLines.length === 1
    },
    selectedLinesData() {
      if (this.selectedLines.length === 1) {
        return this.selectedLines.map(id => {
          const line = this.lines.find(l => l.id === id)
          if (line) return line
          return this.bsplines.find(b => b.id === id)
        }).filter(Boolean)
      }
      return []
    }
  },
  methods: {
    updateLine(line) {
      this.$emit('update-line', line)
    },
    
    updateLineLayer(line, layerValue) {
      // 更新图层信息
      if (Array.isArray(line.layerIds)) {
        line.layerIds = [layerValue]
      } else {
        line.layerId = layerValue
      }
      this.updateLine(line)
    },
    
    getLineConnectionStatus(line) {
      const startConnected = this.points.some(p => p.id === line.startPointId)
      const endConnected = this.points.some(p => p.id === line.endPointId)
      
      if (startConnected && endConnected) return '连接正常'
      if (startConnected) return '起点连接'
      if (endConnected) return '终点连接'
      return '连接断开'
    },
    
    getLineLength(line) {
      const startPoint = this.points.find(p => p.id === line.startPointId)
      const endPoint = this.points.find(p => p.id === line.endPointId)
      
      if (startPoint && endPoint) {
        const dx = endPoint.x - startPoint.x
        const dy = endPoint.y - startPoint.y
        const length = Math.sqrt(dx * dx + dy * dy)
        return `${length.toFixed(1)} 单位`
      }
      return '无法计算'
    },

    toggleTrackField(line, field, onValue = 'true') {
      line.fields = line.fields || {}
      if (line.fields[field] != null) delete line.fields[field]
      else line.fields[field] = onValue
      this.updateLine(line)
    },

    setDefaultSwitchDef(line) {
      this.toggleTrackField(
        line,
        'switchDef',
        JSON.stringify({ front: 1, left: 1, right: 1, frontUp: 1, back: 1, frok: 1, backUp: 1 })
      )
    },

    setJsonArrayField(line, field, title) {
      line.fields = line.fields || {}
      const current = line.fields[field] || '[]'
      const raw = window.prompt(title, current)
      if (raw == null) return
      const ids = raw
        .split(',')
        .map(x => Number(String(x).trim()))
        .filter(n => Number.isFinite(n))
      if (!ids.length) {
        delete line.fields[field]
      } else {
        line.fields[field] = JSON.stringify([...new Set(ids)])
      }
      this.updateLine(line)
    }
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
  align-items: center;
  margin-bottom: 8px;
}

.property-group label {
  width: 80px;
  color: #a0aec0;
  font-size: 12px;
  font-weight: 500;
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

.editable-input:focus,
.editable-select:focus {
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

.line-action-card {
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  padding: 12px;
}

.vertical-list {
  display: flex;
  flex-direction: column;
}
</style>
