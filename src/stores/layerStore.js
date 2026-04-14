import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nextId } from '../utils/idGenerator.js'

/**
 * @typedef {{id:string, name:string, visible:boolean, color?:string}} Layer
 */

export const useLayerStore = defineStore('draw/layer', () => {
  // 图层列表，默认包含一个默认图层 'g'
  const layers = ref([
    { id: 'g', name: 'g', visible: true }
  ])

  // 当前活跃图层（新增元素时使用的图层）
  const activeLayerId = ref('g')

  // 获取可见的图层ID列表
  const visibleLayerIds = computed(() => {
    return layers.value
      .filter(layer => layer.visible)
      .map(layer => layer.id)
  })

  // 获取当前活跃图层
  const activeLayer = computed(() => {
    return layers.value.find(layer => layer.id === activeLayerId.value)
  })

  // 添加新图层
  /**
   * 新增图层（自动处理重名）
   * @param {string} name
   * @returns {Layer}
   */
  const addLayer = (name) => {
    // 生成唯一ID（简单的时间戳+随机数）
    const id = 'layer_' + nextId() + '_' + Math.random().toString(36).substr(2, 9)
    
    // 检查名称是否重复
    const existingNames = layers.value.map(layer => layer.name)
    let finalName = name
    let counter = 1
    
    while (existingNames.includes(finalName)) {
      finalName = `${name}_${counter}`
      counter++
    }

    const newLayer = {
      id,
      name: finalName,
      visible: true
    }

    layers.value.push(newLayer)
    return newLayer
  }

  // 删除图层（不能删除默认图层）
  /**
   * 删除图层（默认图层 g 不可删除）
   * @param {string} layerId
   * @returns {boolean}
   */
  const removeLayer = (layerId) => {
    if (layerId === 'g') {
      console.warn('不能删除默认图层')
      return false
    }

    const index = layers.value.findIndex(layer => layer.id === layerId)
    if (index !== -1) {
      layers.value.splice(index, 1)
      
      // 如果删除的是当前活跃图层，切换到默认图层
      if (activeLayerId.value === layerId) {
        activeLayerId.value = 'g'
      }
      
      return true
    }
    return false
  }

  // 切换图层可见性
  const toggleLayerVisibility = (layerId) => {
    const layer = layers.value.find(layer => layer.id === layerId)
    if (layer) {
      layer.visible = !layer.visible
    }
  }

  // 设置图层可见性
  /**
   * @param {string} layerId
   * @param {boolean} visible
   */
  const setLayerVisibility = (layerId, visible) => {
    const layer = layers.value.find(layer => layer.id === layerId)
    if (layer) {
      layer.visible = visible
    }
  }

  // 设置活跃图层
  /**
   * @param {string} layerId
   */
  const setActiveLayer = (layerId) => {
    const layer = layers.value.find(layer => layer.id === layerId)
    if (layer) {
      activeLayerId.value = layerId
    }
  }

  // 重命名图层
  /**
   * @param {string} layerId
   * @param {string} newName
   * @returns {boolean}
   */
  const renameLayer = (layerId, newName) => {
    const layer = layers.value.find(layer => layer.id === layerId)
    if (layer && newName.trim()) {
      // 检查名称是否重复（排除自己）
      const existingNames = layers.value
        .filter(l => l.id !== layerId)
        .map(l => l.name)
      
      let finalName = newName.trim()
      let counter = 1
      
      while (existingNames.includes(finalName)) {
        finalName = `${newName.trim()}_${counter}`
        counter++
      }
      
      layer.name = finalName
      return true
    }
    return false
  }

  // 获取图层信息
  /**
   * @param {string} layerId
   * @returns {Layer|undefined}
   */
  const getLayer = (layerId) => {
    return layers.value.find(layer => layer.id === layerId)
  }

  // 根据图层名称获取图层ID
  /**
   * @param {string} layerName
   * @returns {string}
   */
  const getLayerIdByName = (layerName) => {
    if (layerName === 'g') return 'g' // 默认图层
    let layer = layers.value.find(layer => layer.name === layerName)
    
    // 如果找不到该图层，自动创建
    if (!layer) {
      if (import.meta.env.DEV) console.log('🔍 DEBUG: Auto-creating layer', layerName)
      const newLayerId = layerName // 直接使用名称作为ID
      layer = {
        id: newLayerId,
        name: layerName,
        visible: true,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      }
      layers.value.push(layer)
      if (import.meta.env.DEV) console.log('🔍 DEBUG: Layer created', layer)
    }
    
    return layer.id
  }

  // 检查图层是否可见
  /**
   * @param {string} layerId
   * @returns {boolean}
   */
  const isLayerVisible = (layerId) => {
    const layer = layers.value.find(layer => layer.id === layerId)
    return layer ? layer.visible : false
  }

  // 过滤元素：只返回至少属于一个可见图层的元素。
  // 兼容两种字段格式：
  //   layerIds: string[]  — 新建元素，可同时归属多个图层
  //   layerId:  string    — 从文件加载的旧格式元素，单一图层
  /**
   * @template T
   * @param {T[]|undefined|null} elements
   * @returns {T[]}
   */
  const filterVisibleElements = (elements) => {
    if (!elements || !Array.isArray(elements)) return []
    return elements.filter(element => {
      if (Array.isArray(element.layerIds) && element.layerIds.length > 0) {
        return element.layerIds.some(id => isLayerVisible(id))
      }
      if (element.layerId) {
        return isLayerVisible(element.layerId)
      }
      // 兜底：无图层信息视为默认图层
      return isLayerVisible('g')
    })
  }

  // 将元素分配到当前所有可见图层（新建元素专用）。
  // 返回附带 layerIds 数组的新对象，不修改原对象。
  // 若当前没有任何图层可见，layerIds 为空数组（元素暂不可见，符合预期）。
  /**
   * @template T
   * @param {T} element
   * @returns {T & {layerIds:string[]}}
   */
  const assignElementToVisibleLayers = (element) => {
    return {
      ...element,
      layerIds: visibleLayerIds.value.slice(), // 快照当前可见图层列表
    }
  }

  // 为元素分配图层ID
  const assignElementToLayer = (element, layerId = null) => {
    const targetLayerId = layerId || activeLayerId.value
    return {
      ...element,
      layerId: targetLayerId
    }
  }

  // 批量分配元素到图层
  const assignElementsToLayer = (elements, layerId) => {
    return elements.map(element => assignElementToLayer(element, layerId))
  }

  // 移动元素到另一个图层
  const moveElementToLayer = (element, targetLayerId) => {
    return assignElementToLayer(element, targetLayerId)
  }

  // 获取图层统计信息
  const getLayerStats = (elements) => {
    const stats = {}
    
    // 初始化所有图层的计数
    layers.value.forEach(layer => {
      stats[layer.id] = {
        name: layer.name,
        visible: layer.visible,
        count: 0
      }
    })

    // 统计元素数量
    if (elements && Array.isArray(elements)) {
      elements.forEach(element => {
        const layerId = element.layerId || 'g'
        if (stats[layerId]) {
          stats[layerId].count++
        }
      })
    }

    return stats
  }

  return {
    // 状态
    layers,
    activeLayerId,
    
    // 计算属性
    visibleLayerIds,
    activeLayer,
    
    // 方法
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setLayerVisibility,
    setActiveLayer,
    renameLayer,
    getLayer,
    getLayerIdByName,
    isLayerVisible,
    
    // 元素操作方法
    filterVisibleElements,
    assignElementToVisibleLayers,
    assignElementToLayer,
    assignElementsToLayer,
    moveElementToLayer,
    getLayerStats
  }
})
