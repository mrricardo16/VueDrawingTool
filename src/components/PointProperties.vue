<template>
  <div class="properties-detail">
    <div v-if="!hasSelection" class="no-selection">
      <p>请选择一个点查看详细属性</p>
    </div>
    
    <div v-else class="property-section">
      <TabNavigation 
        :tabs="pointTabs" 
        :active-tab="activeTab"
        @tab-change="activeTab = $event"
      />
      
      <div class="mini-tab-content">
        <!-- 属性标签页 -->
        <div v-if="activeTab === 'properties'" class="properties-content">
          <div v-for="point in selectedPointsData" :key="point.id" class="property-item">
            <div class="property-group">
              <label>序号:</label>
              <input v-model="point.id" type="text" readonly class="readonly-input">
            </div>
            <div class="property-group">
              <label>名字:</label>
              <input v-model="point.name" @change="updatePoint(point)" type="text" class="editable-input">
            </div>
            <div class="property-group">
              <label>X坐标:</label>
              <input v-model.number="point.x" @change="updatePoint(point)" type="number" step="0.1" class="editable-input">
            </div>
            <div class="property-group">
              <label>Y坐标:</label>
              <input v-model.number="point.y" @change="updatePoint(point)" type="number" step="0.1" class="editable-input">
            </div>
            <div class="property-group">
              <label>类型:</label>
              <select v-model="point.type" @change="updatePoint(point)" class="editable-select">
                <option value="point">普通点</option>
                <option value="site">站点</option>
                <option value="rest">休息点</option>
                <option value="charging">充电点</option>
                <option value="escape">紧急出口</option>
                <option value="staging">暂存站点</option>
              </select>
            </div>
            
            <!-- 扩展字段 -->
            <div class="property-group">
              <label>循环ID:</label>
              <input v-model="point.fields.loopid" @change="updatePoint(point)" type="text" class="editable-input" placeholder="循环ID">
            </div>
            <div class="property-group">
              <label>高度范围:</label>
              <input v-model="point.fields.heights" @change="updatePoint(point)" type="text" class="editable-input" placeholder="[300,400]">
            </div>
            <div class="property-group">
              <label>到达动作:</label>
              <input v-model="point.fields.codeArrive" @change="updatePoint(point)" type="text" class="editable-input" placeholder="agv.ActionCharge(true)">
            </div>
            <div class="property-group">
              <label>离开动作:</label>
              <input v-model="point.fields.codeLeave" @change="updatePoint(point)" type="text" class="editable-input" placeholder="agv.ActionCharge(false)">
            </div>
            <div class="property-group">
              <label>必须空闲:</label>
              <input v-model="point.fields.mustFree" @change="updatePoint(point)" type="text" class="editable-input" placeholder="[]">
            </div>
          </div>
        </div>
        
        <!-- 状态标签页（已移除） -->
        
        <!-- 动作标签页 -->
        <div v-else-if="activeTab === 'actions'" class="actions-content">
          <div v-for="point in selectedPointsData" :key="point.id" class="actions-item">
            <div class="action-header">
              <h4>站点 {{ point.id }} - {{ point.name || '未命名' }}</h4>
            </div>

            <div class="action-buttons">
              <button @click="allowLock(point)" class="mini-action-btn secondary">启用该点</button>
              <button @click="preventLock(point)" class="mini-action-btn secondary">禁用该点</button>
              <button @click="clearTags(point)" class="mini-action-btn secondary">清除标记</button>
              <button @click="showConflicts(point)" class="mini-action-btn secondary">显示该点的必空点</button>
              <button @click="setMustFree(point)" class="mini-action-btn secondary">设置必空点</button>
              <button @click="showDebug(point)" class="mini-action-btn secondary">显示调试信息</button>
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
  name: 'PointProperties',
  components: {
    TabNavigation
  },
  props: {
    selectedPoints: {
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
    }
  },
  emits: ['update-point'],
  data() {
    return {
      activeTab: 'properties',
      pointTabs: [
        { key: 'properties', label: '属性' },
        { key: 'actions', label: '动作' }
      ]
    };
  },
  computed: {
    hasSelection() {
      return this.selectedPoints.length === 1
    },
    selectedPointsData() {
      if (this.selectedPoints.length === 1) {
        return this.selectedPoints.map(id => this.points.find(p => p.id === id)).filter(Boolean)
      }
      return []
    }
  },
  methods: {
    updatePoint(point) {
      this.$emit('update-point', point)
    },
    
    getPointTypeLabel(pointOrType) {
      const typeLabels = {
        point: "普通点",
        site: "站点",
        rest: "休息点",
        charging: "充电点",
        escape: "紧急出口",
        staging: "暂存站点",
      };

      // 支持传入完整 point 对象或直接传入类型字符串
      if (pointOrType && typeof pointOrType === "object") {
        const t = pointOrType.type;
        if (t && typeLabels[t]) return typeLabels[t];

        const f = pointOrType.fields || {};
        if (f.stagingSite === "true" || f.staging === "true") return typeLabels.staging;
        if (f.charge === "true" || f.charging === "true") return typeLabels.charging;
        if (f.escape === "true") return typeLabels.escape;
        if (f.standby === "true" || f.rest === "true") return typeLabels.rest;
        if (f.shelf === "true" || f.site === "true") return typeLabels.site;

        return typeLabels.point;
      }

      // 直接传入类型字符串的场景
      if (typeof pointOrType === "string") {
        return typeLabels[pointOrType] || "未知类型";
      }

      return "未知类型";
    },
    
    getConnectionStatus(pointId) {
      const connectedLines = this.lines.filter(line => 
        line.startPointId === pointId || line.endPointId === pointId
      )
      const count = connectedLines.length
      if (count === 0) return '未连接'
      if (count === 1) return '单连接'
      return `多连接 (${count})`
    },
    
    getCreationTime(pointId) {
      return new Date().toLocaleString('zh-CN')
    },
    
    allowLock(point) {
      point.fields = point.fields || {}
      delete point.fields.preventLock
      this.updatePoint(point)
    },

    preventLock(point) {
      point.fields = point.fields || {}
      point.fields.preventLock = 'true'
      this.updatePoint(point)
    },

    clearTags(point) {
      point.fields = point.fields || {}
      delete point.fields.preventLock
      delete point.fields.tags
      this.updatePoint(point)
    },

    showConflicts(point) {
      const raw = point.fields?.mustFree || '[]'
      alert(`必空点: ${raw}`)
    },

    setMustFree(point) {
      point.fields = point.fields || {}
      const raw = window.prompt('请输入必空点ID（逗号分隔）', point.fields.mustFree || '[]')
      if (raw == null) return
      const ids = raw
        .split(',')
        .map(x => Number(String(x).trim()))
        .filter(n => Number.isFinite(n))
      point.fields.mustFree = JSON.stringify([...new Set(ids)])
      this.updatePoint(point)
    },

    showDebug(point) {
      alert(`${point.name || 'NoName'}(${point.id})\n${JSON.stringify(point.fields || {}, null, 2)}`)
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

.checkbox-group {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a0aec0;
  font-size: 12px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.status-content {
  padding: 12px;
}

.status-item {
  margin-bottom: 16px;
}

.status-info {
  background: #2d3748;
  border-radius: 6px;
  padding: 12px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #4a5568;
}

.status-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.status-label {
  color: #a0aec0;
  font-size: 12px;
  font-weight: 500;
  min-width: 80px;
}

.status-value {
  color: #e2e8f0;
  font-size: 12px;
  flex: 1;
}

.status-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 4px;
  margin-bottom: 4px;
}

.status-tag.shelf {
  background: #3b82f6;
  color: white;
}

.status-tag.escape {
  background: #ef4444;
  color: white;
}

.status-tag.standby {
  background: #f59e0b;
  color: white;
}

.status-tag.staging {
  background: #10b981;
  color: white;
}

.status-tag.charge {
  background: #8b5cf6;
  color: white;
}

.status-tag.normal {
  background: #6b7280;
  color: white;
}

.action-info {
  margin-bottom: 4px;
}

.action-info small {
  color: #a0aec0;
  font-family: monospace;
  display: block;
}

.actions-content {
  padding: 12px;
}

.actions-item {
  margin-bottom: 20px;
  background: #2d3748;
  border-radius: 6px;
  padding: 16px;
}

.action-header {
  margin-bottom: 16px;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 12px;
}

.action-header h4 {
  color: #e2e8f0;
  margin: 0;
  font-size: 12px;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.mini-action-btn:hover {
  transform: translateY(-1px);
}

.mini-action-btn.primary {
  background: #3b82f6;
  color: white;
}

.mini-action-btn.primary:hover {
  background: #2563eb;
}

.mini-action-btn.danger {
  background: #ef4444;
  color: white;
}

.mini-action-btn.danger:hover {
  background: #dc2626;
}

.mini-action-btn.secondary {
  background: #6b7280;
  color: white;
}

.mini-action-btn.secondary:hover {
  background: #4b5563;
}

.mini-action-btn:disabled {
  background: #4a5568;
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.quick-actions {
  margin-bottom: 16px;
}

.quick-actions h5,
.action-templates h5 {
  color: #e2e8f0;
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
}

.quick-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 6px;
}

.quick-btn {
  padding: 6px 8px;
  border: 1px solid #4a5568;
  border-radius: 4px;
  background: #1a202c;
  color: #a0aec0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-btn:hover {
  background: #2d3748;
  border-color: #6b7280;
}

.quick-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.template-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.template-btn {
  padding: 8px 12px;
  border: 1px solid #4a5568;
  border-radius: 4px;
  background: #1a202c;
  color: #a0aec0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-btn:hover {
  background: #2d3748;
  border-color: #6b7280;
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
