<template>
  <div class="mini-tab-header">
    <div 
      v-for="tab in tabs" 
      :key="tab.key"
      :class="['mini-tab-item', { active: activeTab === tab.key }]"
      @click="$emit('tab-change', tab.key)"
    >
      {{ tab.label }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'TabNavigation',
  props: {
    tabs: {
      type: Array,
      required: true
    },
    activeTab: {
      type: String,
      required: true
    }
  },
  emits: ['tab-change']
}
</script>

<style scoped>
.mini-tab-header {
  display: flex;
  background: #1a202c;
  border-bottom: 1px solid #4a5568;
  border-radius: 6px 6px 0 0;
  overflow: hidden;
}

.mini-tab-item {
  flex: 1;
  padding: 8px 12px;
  text-align: center;
  cursor: pointer;
  background: #2d3748;
  color: #a0aec0;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  border-right: 1px solid #4a5568;
}

.mini-tab-item:last-child {
  border-right: none;
}

.mini-tab-item:hover {
  background: #374151;
  color: #e2e8f0;
}

.mini-tab-item.active {
  background: #4299e1;
  color: #ffffff;
  border-bottom: 2px solid #63b3ed;
}

.mini-tab-item.active:hover {
  background: #3182ce;
}
</style>
