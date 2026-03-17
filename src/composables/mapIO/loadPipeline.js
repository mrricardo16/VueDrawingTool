import { nextTick } from 'vue'

/**
 * 清空当前地图与选中状态
 * @param {{
 * points:any,
 * lines:any,
 * bsplines:any,
 * texts:any,
 * areas:any,
 * selectedPoints:any,
 * selectedLines:any,
 * selectedTexts:any,
 * selectedAreas:any
 * }} refs
 */
export function clearMapState({
  points,
  lines,
  bsplines,
  texts,
  areas,
  selectedPoints,
  selectedLines,
  selectedTexts,
  selectedAreas
}) {
  points.value = []
  lines.value = []
  bsplines.value = []
  texts.value = []
  areas.value = []

  selectedPoints.value = []
  selectedLines.value = []
  selectedTexts.value = []
  selectedAreas.value = []
}

/**
 * 将加载结果按批次写回响应式状态，并补齐 layerId。
 * @param {{
 * result:{points:any[],lines:any[],bsplines:any[],texts:any[],areas:any[]},
 * layerStore:{getLayerIdByName:(name:string)=>string},
 * points:any,
 * lines:any,
 * bsplines:any,
 * texts:any,
 * areas:any,
 * loadedCount:any,
 * loadingProgress:any,
 * loadingStatus:any,
 * batchSize?:number,
 * parallel?:boolean
 * }} options
 */
export async function applyLoadedResultInBatches({
  result,
  layerStore,
  points,
  lines,
  bsplines,
  texts,
  areas,
  loadedCount,
  loadingProgress,
  loadingStatus,
  batchSize = 2000,
  parallel = false
}) {
  const total = result.points.length + result.lines.length + result.bsplines.length + result.texts.length + result.areas.length
  let processed = 0

  const batchUpdate = async (src, target) => {
    for (let i = 0; i < src.length; i += batchSize) {
      const batch = src.slice(i, i + batchSize)
      const batchWithLayers = batch.map(element => {
        const layerName = element.layerName || element.layername || 'g'
        const layerId = layerStore.getLayerIdByName(layerName)
        return { ...element, layerId }
      })
      target.push(...batchWithLayers)
      processed += batch.length
      loadedCount.value = processed
      loadingProgress.value = 0.7 + (processed / Math.max(total, 1)) * 0.3
      loadingStatus.value = `正在更新界面 (${processed}/${total})...`
      if (i % (batchSize * 5) === 0) await nextTick()
    }
  }

  const tasks = [
    () => batchUpdate(result.points, points.value),
    () => batchUpdate(result.lines, lines.value),
    () => batchUpdate(result.bsplines, bsplines.value),
    () => batchUpdate(result.texts, texts.value),
    () => batchUpdate(result.areas, areas.value)
  ]

  if (parallel) {
    await Promise.all(tasks.map(t => t()))
  } else {
    for (const task of tasks) {
      await task()
    }
  }
}

/**
 * 加载完成后刷新画布与空间索引
 * @param {any} drawingCanvas
 * @param {{clearPointCache?:boolean}} [options]
 */
export async function refreshCanvasAfterLoad(drawingCanvas, { clearPointCache = false } = {}) {
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(resolve))
  await nextTick()

  if (!drawingCanvas.value) return

  if (clearPointCache) {
    drawingCanvas.value.pointByIdCache = null
  }

  if (drawingCanvas.value.notifyPointsMutated) drawingCanvas.value.notifyPointsMutated()
  if (drawingCanvas.value.$refs?.mouseEventHandler?.rebuildSpatialGrids) {
    drawingCanvas.value.$refs.mouseEventHandler.rebuildSpatialGrids()
  }

  await nextTick()
  if (drawingCanvas.value.resizeCanvas) drawingCanvas.value.resizeCanvas()
  if (drawingCanvas.value.fitToView) drawingCanvas.value.fitToView()
  if (drawingCanvas.value.redraw) drawingCanvas.value.redraw()
}
