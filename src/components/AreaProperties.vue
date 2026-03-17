<template>
  <div class="properties-detail">
    <div v-if="!hasSelection" class="no-selection">
      <p>请选择一个区域查看详细属性</p>
    </div>

    <div v-else class="property-section">
      <TabNavigation
        :tabs="areaTabs"
        :active-tab="activeTab"
        @tab-change="activeTab = $event"
      />

      <div class="mini-tab-content">
        <!-- ── 属性标签页 ───────────────────────────────────── -->
        <div v-if="activeTab === 'properties'" class="properties-content">
          <div v-for="area in selectedAreasData" :key="area.id" class="property-item">
            <div class="property-group">
              <label>序号:</label>
              <input :value="area.id" type="text" readonly class="readonly-input">
            </div>
            <div class="property-group">
              <label>名字:</label>
              <input v-model="area.name" @change="updateArea(area)" type="text" class="editable-input">
            </div>
            <div class="property-group">
              <label>图层:</label>
              <input :value="area.layerId || area.layerIds?.[0]" @input="updateAreaLayer(area, $event.target.value)" type="text" class="editable-input" placeholder="g">
            </div>
            <div class="property-group">
              <label>颜色:</label>
              <input v-model="area.color" @change="updateArea(area)" type="color" class="color-input">
            </div>
            <div class="property-group">
              <label>透明度:</label>
              <input v-model.number="area.opacity" @change="updateArea(area)" type="number" min="0" max="100" class="editable-input" placeholder="50">
            </div>
            <div class="property-group">
              <label>容纳车辆:</label>
              <input v-model.number="area.carNum" @change="updateArea(area)" type="number" min="0" class="editable-input" placeholder="0">
            </div>

            <!-- 顶点信息 -->
            <div class="property-group-title">顶点坐标</div>
            <div v-for="(pt, idx) in (area.points || [])" :key="idx" class="vertex-row">
              <span class="vertex-label">P{{ idx + 1 }}</span>
              <span class="vertex-coord">X: {{ formatNum(pt.x) }}</span>
              <span class="vertex-coord">Y: {{ formatNum(pt.y) }}</span>
            </div>

            <!-- 扩展字段 -->
            <div class="property-group-title">扩展字段</div>
            <div class="property-group">
              <label>场景:</label>
              <input v-model="area.fields.scene" @change="updateArea(area)" type="text" class="editable-input" placeholder="场景标识">
            </div>
            <div class="property-group">
              <label>限速:</label>
              <input v-model="area.fields.speedLimit" @change="updateArea(area)" type="text" class="editable-input" placeholder="最大速度">
            </div>
            <div class="property-group">
              <label>禁止方向:</label>
              <input v-model="area.fields.forbidDir" @change="updateArea(area)" type="text" class="editable-input" placeholder="禁止方向角度">
            </div>
            <div class="property-group">
              <label>备注:</label>
              <textarea v-model="area.fields.remark" @change="updateArea(area)" class="editable-textarea" rows="2" placeholder="备注信息"></textarea>
            </div>
          </div>
        </div>

        <!-- ── 状态标签页 ───────────────────────────────────── -->
        <div v-else-if="activeTab === 'status'" class="status-content">
          <div v-for="area in selectedAreasData" :key="area.id" class="status-item">
            <div class="status-row">
              <span class="status-label">区域ID:</span>
              <span class="status-value">{{ area.id }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">顶点数量:</span>
              <span class="status-value">{{ (area.points || []).length }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">容纳车辆:</span>
              <span class="status-value">{{ area.carNum || 0 }} 辆</span>
            </div>
            <div class="status-row">
              <span class="status-label">透明度:</span>
              <span class="status-value">{{ area.opacity ?? 50 }}%</span>
            </div>
            <div class="status-row">
              <span class="status-label">图层:</span>
              <span class="status-value">{{ area.layerId || area.layerIds?.[0] || 'g' }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">颜色:</span>
              <span class="status-value color-preview-wrap">
                <span class="color-dot" :style="{ background: area.color || '#FFFFFF' }"></span>
                {{ area.color || '#FFFFFF' }}
              </span>
            </div>

            <div class="property-group-title">扩展字段状态</div>
            <template v-if="Object.keys(area.fields || {}).length > 0">
              <div v-for="(val, key) in area.fields" :key="key" class="status-row">
                <span class="status-label">{{ key }}:</span>
                <span class="status-value">{{ val || '未设置' }}</span>
              </div>
            </template>
            <div v-else class="empty-hint">
              <small>无扩展字段</small>
            </div>
          </div>
        </div>

        <!-- ── 动作标签页 ───────────────────────────────────── -->
        <div v-else-if="activeTab === 'actions'" class="actions-content">
          <div v-for="area in selectedAreasData" :key="area.id" class="action-group">
            <h5>快速操作</h5>
            <div class="action-buttons">
              <button @click="toggleCarLimit(area)" class="action-btn">
                {{ area.carNum > 0 ? '🚫 清除车辆限制' : '🚗 设置车辆限制' }}
              </button>
              <button @click="toggleSpeedLimit(area)" class="action-btn">
                {{ area.fields.speedLimit ? '⚡ 清除限速' : '🐢 设置限速' }}
              </button>
              <button @click="resetAreaFields(area)" class="action-btn warning-btn">
                ❌ 清空扩展字段
              </button>
              <button @click="exportAreaData(area)" class="action-btn">
                📋 复制区域数据
              </button>
            </div>

            <h5>预设颜色</h5>
            <div class="color-presets">
              <div
                v-for="preset in colorPresets"
                :key="preset.color"
                class="color-preset"
                :class="{ active: area.color === preset.color }"
                :style="{ background: preset.color }"
                :title="preset.label"
                @click="applyColor(area, preset.color)"
              ></div>
            </div>

            <h5>容量模板</h5>
            <div class="template-buttons">
              <button @click="setCarNum(area, 0)"  class="tpl-btn">无限制</button>
              <button @click="setCarNum(area, 1)"  class="tpl-btn">1辆</button>
              <button @click="setCarNum(area, 2)"  class="tpl-btn">2辆</button>
              <button @click="setCarNum(area, 5)"  class="tpl-btn">5辆</button>
              <button @click="setCarNum(area, 10)" class="tpl-btn">10辆</button>
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
  name: 'AreaProperties',
  components: { TabNavigation },
  props: {
    selectedAreas: { type: Array, default: () => [] },
    areas: { type: Array, default: () => [] }
  },
  emits: ['update-area'],
  data() {
    return {
      activeTab: 'properties',
      areaTabs: [
        { key: 'properties', label: '属性' },
        { key: 'status',     label: '状态' },
        { key: 'actions',    label: '动作' }
      ],
      colorPresets: [
        { color: '#FFFFFF', label: '白色' },
        { color: '#FF0000', label: '红色' },
        { color: '#00FF00', label: '绿色' },
        { color: '#0000FF', label: '蓝色' },
        { color: '#FFFF00', label: '黄色' },
        { color: '#FF8800', label: '橙色' },
        { color: '#FF00FF', label: '紫色' },
        { color: '#00FFFF', label: '青色' },
        { color: '#888888', label: '灰色' }
      ]
    }
  },
  computed: {
    hasSelection() {
      return this.selectedAreas.length === 1
    },
    selectedAreasData() {
      if (!this.hasSelection) return []
      return this.selectedAreas
        .map(id => this.areas.find(a => a.id === id))
        .filter(Boolean)
        .map(a => ({
          ...a,
          fields: a.fields || {},
          points: a.points || []
        }))
    }
  },
  methods: {
    formatNum(v) {
      return typeof v === 'number' ? v.toFixed(1) : v
    },
    updateArea(area) {
      this.$emit('update-area', area)
    },
    
    updateAreaLayer(area, layerValue) {
      // 更新图层信息
      if (Array.isArray(area.layerIds)) {
        area.layerIds = [layerValue]
      } else {
        area.layerId = layerValue
      }
      this.updateArea(area)
    },
    toggleCarLimit(area) {
      area.carNum = area.carNum > 0 ? 0 : 1
      this.updateArea(area)
    },
    toggleSpeedLimit(area) {
      if (area.fields.speedLimit) {
        area.fields.speedLimit = ''
      } else {
        area.fields.speedLimit = '1000'
      }
      this.updateArea(area)
    },
    resetAreaFields(area) {
      if (confirm(`确定要清空区域 ${area.id} 的扩展字段吗？`)) {
        area.fields = {}
        this.updateArea(area)
      }
    },
    exportAreaData(area) {
      const data = JSON.stringify(area, null, 2)
      navigator.clipboard.writeText(data).then(() => {
        alert('区域数据已复制到剪贴板')
      })
    },
    applyColor(area, color) {
      area.color = color
      this.updateArea(area)
    },
    setCarNum(area, num) {
      area.carNum = num
      this.updateArea(area)
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
  font-size: 11px;
  text-align: center;
  padding: 20px;
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
  padding: 8px;
}
.property-item { display: flex; flex-direction: column; gap: 4px; }
.property-group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.property-group label {
  color: #9ca3af;
  font-size: 11px;
  min-width: 60px;
  flex-shrink: 0;
}
.property-group-title {
  color: #6b7280;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 10px 0 4px;
  padding-bottom: 2px;
  border-bottom: 1px solid #374151;
}
.readonly-input {
  background: #1f2937; border: 1px solid #374151; color: #6b7280;
  padding: 2px 6px; border-radius: 3px; font-size: 11px; flex: 1;
}
.editable-input {
  background: #1f2937; border: 1px solid #4b5563; color: #e2e8f0;
  padding: 2px 6px; border-radius: 3px; font-size: 11px; flex: 1;
}
.editable-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
.color-input {
  width: 40px; height: 22px; border: 1px solid #4b5563; border-radius: 3px;
  cursor: pointer; padding: 0; background: none;
}
.editable-textarea {
  background: #1f2937; border: 1px solid #4b5563; color: #e2e8f0;
  padding: 4px 6px; border-radius: 3px; font-size: 11px; flex: 1;
  resize: vertical; min-height: 30px;
}
.editable-textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
.vertex-row {
  display: flex; align-items: center; gap: 8px;
  padding: 2px 0; font-size: 11px;
}
.vertex-label { color: #60a5fa; font-weight: 600; min-width: 24px; }
.vertex-coord { color: #9ca3af; }

/* 状态页 */
.status-item { display: flex; flex-direction: column; gap: 4px; }
.status-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 3px 0; border-bottom: 1px solid #374151; font-size: 11px;
}
.status-label { color: #9ca3af; }
.status-value { color: #e2e8f0; text-align: right; }
.color-preview-wrap { display: flex; align-items: center; gap: 4px; }
.color-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid #4b5563; }
.empty-hint { color: #6b7280; font-size: 11px; padding: 4px 0; }

/* 动作页 */
.actions-content { display: flex; flex-direction: column; gap: 12px; }
.action-group { display: flex; flex-direction: column; gap: 6px; }
.action-group h5 {
  color: #9ca3af; font-size: 10px; font-weight: 600;
  text-transform: uppercase; margin: 4px 0 2px;
  border-bottom: 1px solid #374151; padding-bottom: 2px;
}
.action-buttons { display: flex; flex-direction: column; gap: 4px; }
.action-btn {
  background: #374151; border: 1px solid #4b5563; color: #e2e8f0;
  padding: 4px 8px; border-radius: 4px; font-size: 11px;
  cursor: pointer; text-align: left; transition: background 0.15s;
}
.action-btn:hover { background: #4b5563; }
.warning-btn { border-color: #ef4444; color: #fca5a5; }
.warning-btn:hover { background: #7f1d1d; }

.color-presets {
  display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;
}
.color-preset {
  width: 20px; height: 20px; border-radius: 3px;
  border: 2px solid transparent; cursor: pointer; transition: border-color 0.15s;
}
.color-preset:hover { border-color: #9ca3af; }
.color-preset.active { border-color: #3b82f6; }

.template-buttons { display: flex; flex-wrap: wrap; gap: 4px; }
.tpl-btn {
  background: #1f2937; border: 1px solid #4b5563; color: #e2e8f0;
  padding: 3px 8px; border-radius: 3px; font-size: 11px; cursor: pointer;
}
.tpl-btn:hover { background: #374151; border-color: #6b7280; }
</style>
