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
        
        <!-- 状态标签页 -->
        <div v-else-if="activeTab === 'status'" class="status-content">
          <div v-for="point in selectedPointsData" :key="point.id" class="status-item">
            <div class="status-info">
              <div class="status-row">
                <span class="status-label">站点ID:</span>
                <span class="status-value">{{ point.id }}</span>
              </div>
              <div class="status-row">
                <span class="status-label">站点名称:</span>
                <span class="status-value">{{ point.name || '未命名' }}</span>
              </div>
              <div class="status-row">
                <span class="status-label">站点类型:</span>
                <span class="status-value">{{ getPointTypeLabel(point.type) }}</span>
              </div>
              <div class="status-row">
                <span class="status-label">坐标位置:</span>
                <span class="status-value">X: {{ point.x.toFixed(2) }}, Y: {{ point.y.toFixed(2) }}</span>
              </div>
              <div class="status-row">
                <span class="status-label">循环ID:</span>
                <span class="status-value">{{ point.fields.loopid || '无' }}</span>
              </div>
              <div class="status-row">
                <span class="status-label">高度范围:</span>
                <span class="status-value">{{ point.fields.heights || '未设置' }}</span>
              </div>
              <div class="status-row">
                <span class="status-label">必须空闲:</span>
                <span class="status-value">{{ point.fields.mustFree || '[]' }}</span>
              </div>
              <div class="status-row">
                <span class="status-label">特殊属性:</span>
                <span class="status-value">
                  <span v-if="point.fields.shelf === 'true'" class="status-tag shelf">货架</span>
                  <span v-if="point.fields.escape === 'true'" class="status-tag escape">紧急出口</span>
                  <span v-if="point.fields.standby === 'true'" class="status-tag standby">休息点</span>
                  <span v-if="point.fields.stagingSite === 'true'" class="status-tag staging">暂存站点</span>
                  <span v-if="point.fields.charge === 'true'" class="status-tag charge">充电点</span>
                  <span v-if="!point.fields.shelf && !point.fields.escape && !point.fields.standby && !point.fields.stagingSite && !point.fields.charge" class="status-tag normal">普通站点</span>
                </span>
              </div>
              <div class="status-row">
                <span class="status-label">动作配置:</span>
                <span class="status-value">
                  <div v-if="point.fields.codeArrive" class="action-info">
                    <small>到达: {{ point.fields.codeArrive }}</small>
                  </div>
                  <div v-if="point.fields.codeLeave" class="action-info">
                    <small>离开: {{ point.fields.codeLeave }}</small>
                  </div>
                  <div v-if="!point.fields.codeArrive && !point.fields.codeLeave" class="action-info">
                    <small>无动作配置</small>
                  </div>
                </span>
              </div>
              <div class="status-row">
                <span class="status-label">连接状态:</span>
                <span class="status-value">{{ getConnectionStatus(point.id) }}</span>
              </div>
              <div class="status-row">
                <span class="status-label">创建时间:</span>
                <span class="status-value">{{ getCreationTime(point.id) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 动作标签页 -->
        <div v-else-if="activeTab === 'actions'" class="actions-content">
          <div v-for="point in selectedPointsData" :key="point.id" class="actions-item">
            <div class="action-header">
              <h4>站点 {{ point.id }} - {{ point.name || '未命名' }}</h4>
            </div>
            
            <div class="action-buttons">
              <button @click="copyPoint(point)" class="mini-action-btn primary">
                📋 复制站点
              </button>
              <button @click="deletePoint(point)" class="mini-action-btn danger">
                🗑️ 删除站点
              </button>
              <button @click="resetPointFields(point)" class="mini-action-btn secondary">
                🔄 重置字段
              </button>
              <button @click="exportPointData(point)" class="mini-action-btn secondary">
                📤 导出数据
              </button>
            </div>
            
            <div class="quick-actions">
              <h5>快速操作</h5>
              <div class="quick-action-grid">
                <button @click="setAsShelf(point)" :class="['quick-btn', point.fields.shelf === 'true' ? 'active' : '']">
                  🏪 设为货架
                </button>
                <button @click="setAsCharging(point)" :class="['quick-btn', point.fields.charge === 'true' ? 'active' : '']">
                  🔋 设为充电点
                </button>
                <button @click="setAsStandby(point)" :class="['quick-btn', point.fields.standby === 'true' ? 'active' : '']">
                  ⏸️ 设为休息点
                </button>
                <button @click="setAsEscape(point)" :class="['quick-btn', point.fields.escape === 'true' ? 'active' : '']">
                  🚪 设为紧急出口
                </button>
                <button @click="setAsStaging(point)" :class="['quick-btn', point.fields.stagingSite === 'true' ? 'active' : '']">
                  📦 设为暂存站点
                </button>
                <button @click="clearSpecialFields(point)" class="quick-btn">
                  ❌ 清除特殊属性
                </button>
              </div>
            </div>
            
            <div class="action-templates">
              <h5>动作模板</h5>
              <div class="template-buttons">
                <button @click="applyChargingTemplate(point)" class="template-btn">
                  ⚡ 充电点模板
                </button>
                <button @click="applyShelfTemplate(point)" class="template-btn">
                  📦 货架模板
                </button>
                <button @click="applyRestTemplate(point)" class="template-btn">
                  🛏️ 休息点模板
                </button>
              </div>
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
        { key: 'status', label: '状态' },
        { key: 'actions', label: '动作' }
      ]
    }
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
    
    getPointTypeLabel(type) {
      const typeLabels = {
        'point': '普通点',
        'site': '站点',
        'rest': '休息点',
        'charging': '充电点',
        'escape': '紧急出口',
        'staging': '暂存站点'
      }
      return typeLabels[type] || '未知类型'
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
    
    // 动作相关方法
    copyPoint(point) {
      const newPoint = {
        ...point,
        id: Date.now(),
        name: `${point.name || 'NoName'}_副本`,
        x: point.x + 100,
        y: point.y + 100
      }
      this.$emit('update-point', newPoint)
    },
    
    deletePoint(point) {
      if (confirm(`确定要删除站点 ${point.id} 吗？`)) {
        // 这里应该发出删除事件，而不是更新事件
        if (import.meta.env.DEV) console.log('删除站点功能待实现:', point.id)
      }
    },
    
    resetPointFields(point) {
      point.fields = {}
      this.updatePoint(point)
    },
    
    exportPointData(point) {
      const data = JSON.stringify(point, null, 2)
      navigator.clipboard.writeText(data).then(() => {
        alert('站点数据已复制到剪贴板')
      })
    },
    
    // 快速设置方法
    setAsShelf(point) {
      point.fields.shelf = point.fields.shelf === 'true' ? 'false' : 'true'
      point.fields.heights = point.fields.heights || '[300,400]'
      this.updatePoint(point)
    },
    
    setAsCharging(point) {
      point.fields.charge = point.fields.charge === 'true' ? 'false' : 'true'
      point.fields.codeArrive = point.fields.codeArrive || 'agv.ActionCharge(true)'
      point.fields.codeLeave = point.fields.codeLeave || 'agv.ActionCharge(false)'
      this.updatePoint(point)
    },
    
    setAsStandby(point) {
      point.fields.standby = point.fields.standby === 'true' ? 'false' : 'true'
      this.updatePoint(point)
    },
    
    setAsEscape(point) {
      point.fields.escape = point.fields.escape === 'true' ? 'false' : 'true'
      this.updatePoint(point)
    },
    
    setAsStaging(point) {
      point.fields.stagingSite = point.fields.stagingSite === 'true' ? 'false' : 'true'
      this.updatePoint(point)
    },
    
    clearSpecialFields(point) {
      point.fields.shelf = 'false'
      point.fields.escape = 'false'
      point.fields.standby = 'false'
      point.fields.stagingSite = 'false'
      point.fields.charge = 'false'
      this.updatePoint(point)
    },
    
    // 模板应用方法
    applyChargingTemplate(point) {
      point.fields = {
        ...point.fields,
        charge: 'true',
        codeArrive: 'agv.ActionCharge(true)',
        codeLeave: 'agv.ActionCharge(false)'
      }
      this.updatePoint(point)
    },
    
    applyShelfTemplate(point) {
      point.fields = {
        ...point.fields,
        shelf: 'true',
        heights: '[300,400]',
        loopid: point.fields.loopid || ''
      }
      this.updatePoint(point)
    },
    
    applyRestTemplate(point) {
      point.fields = {
        ...point.fields,
        standby: 'true'
      }
      this.updatePoint(point)
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
  font-size: 14px;
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
  font-size: 10px;
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
  font-size: 14px;
  font-weight: 600;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
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
  font-size: 13px;
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
  font-size: 11px;
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
  font-size: 11px;
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
