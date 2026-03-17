/**
 * useMapIO 图层相关工具
 */

/**
 * @param {any} mapData
 * @returns {string[]}
 */
export function detectLayersFromMapData(mapData) {
  const layerNames = new Set()

  const collectLayers = (elements) => {
    elements.forEach(element => {
      const layerName = element.layerName || element.layername || 'g'
      layerNames.add(layerName)
    })
  }

  if (mapData.points) collectLayers(mapData.points)
  if (mapData.lines) collectLayers(mapData.lines)
  if (mapData.bsplines) collectLayers(mapData.bsplines)
  if (mapData.texts) collectLayers(mapData.texts)
  if (mapData.areas) collectLayers(mapData.areas)

  return Array.from(layerNames).sort()
}

/**
 * @param {any} mapData
 * @param {{layers:Array<{name:string}>,addLayer:(name:string)=>any}} layerStore
 */
export function setupLayersFromMapData(mapData, layerStore) {
  const detectedLayers = detectLayersFromMapData(mapData)

  if (import.meta.env.DEV) {
    console.log('检测到的图层:', detectedLayers)
  }

  const existingLayerNames = layerStore.layers.map(l => l.name)

  detectedLayers.forEach(layerName => {
    if (layerName !== 'g' && !existingLayerNames.includes(layerName)) {
      layerStore.addLayer(layerName)
      if (import.meta.env.DEV) {
        console.log('创建新图层:', layerName)
      }
    }
  })
}

/**
 * 解析图层名称（始终返回短名称，不返回内部长ID）
 * @param {any} element
 * @param {{layers?:Array<{id:string,name:string}>}} layerStore
 * @returns {string}
 */
export function resolveLayerName(element, layerStore) {
  const direct = element.layerName || element.layername
  if (direct && direct.length <= 20) return direct

  const layerId = element.layerId || element.layerIds?.[0]
  if (layerId) {
    const layer = layerStore.layers?.find?.(l => l.id === layerId)
    if (layer?.name) return layer.name
    if (layerId.length <= 20) return layerId
  }

  return direct || 'g'
}
