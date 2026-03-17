/**
 * useMapIO.js
 * 地图文件的读取（异步批量加载）与保存（JSON 序列化），从 App.vue 中提取。
 */

import { ref, computed, nextTick } from 'vue'
import MapLoader from '../utils/mapLoader.js'
import { useLayerStore } from '../stores/layerStore.js'
import MapAPI from '../api/map.js'
import { triggerFileSelect, downloadJson } from './mapIO/fileHandler.js'
import { detectLayersFromMapData, setupLayersFromMapData as setupLayers, resolveLayerName as resolveLayerNameByStore } from './mapIO/layerUtils.js'
import { getSiteType, buildLocalMapData, buildServerPayloadData } from './mapIO/payloadBuilder.js'
import { clearMapState, applyLoadedResultInBatches, refreshCanvasAfterLoad } from './mapIO/loadPipeline.js'

/**
 * @typedef {import('../models/types').Point} Point
 * @typedef {import('../models/types').Line} Line
 * @typedef {import('../models/types').BSpline} BSpline
 * @typedef {import('../models/types').TextElement} TextElement
 * @typedef {import('../models/types').Area} Area
 */

/**
 * @param {{
 * points:any,
 * lines:any,
 * bsplines:any,
 * texts:any,
 * areas:any,
 * selectedPoints:any,
 * selectedLines:any,
 * selectedTexts:any,
 * selectedAreas:any,
 * record?:(op:string,payload:any)=>void,
 * HistoryOp:Record<string,string>,
 * cloneElement:<T>(el:T)=>T,
 * drawingCanvas:any,
 * rebuildIdMaps?:()=>void
 * }} deps
 */
export function useMapIO({
  points, lines, bsplines, texts, areas,
  selectedPoints, selectedLines, selectedTexts, selectedAreas,
  record,
  HistoryOp,
  cloneElement,
  drawingCanvas,
  rebuildIdMaps
}) {
  // ─── 图层管理────────────────────────────────────────────────────────────
  const layerStore = useLayerStore()

  const isLoading = ref(false)
  const loadingProgress = ref(0)
  const loadingStatus = ref('')
  const loadedCount = ref(0)
  const loadingStartTime = ref(0)

  const estimatedTime = computed(() => {
    if (loadingProgress.value <= 0 || loadingProgress.value >= 1) return 0
    const elapsed = (Date.now() - loadingStartTime.value) / 1000
    const remaining = (elapsed / loadingProgress.value) * (1 - loadingProgress.value)
    return Math.max(1, Math.round(remaining))
  })

  // ─── 图层/字段工具（来自拆分模块）──────────────────────────────────────

  /** @param {any} mapData */
  const setupLayersFromMapData = (mapData) => setupLayers(mapData, layerStore)
  /** @param {any} element */
  const resolveLayerName = (element) => resolveLayerNameByStore(element, layerStore)

  // ─── 打开文件 ──────────────────────────────────────────────────────────

  /** @param {HTMLInputElement|{value:any}|null} fileInput */
  const handleUploadMap = (fileInput) => triggerFileSelect(fileInput)

  /** @param {Event & {target: HTMLInputElement}} event */
  const handleFileSelected = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      isLoading.value = true
      loadingProgress.value = 0
      loadingStatus.value = '正在读取文件...'
      loadedCount.value = 0
      loadingStartTime.value = Date.now()

      // 缓存“加载前”的状态：LOAD_MAP 需要 before+after 才能支持 undo/redo
      const beforeSnapshot = {
        points: points.value.map(cloneElement),
        lines: lines.value.map(cloneElement),
        bsplines: bsplines.value.map(cloneElement),
        texts: texts.value.map(cloneElement),
        areas: areas.value.map(cloneElement)
      }

      await MapLoader.loadMapAsync(
        file,
        (progress, status) => {
          loadingProgress.value = progress
          loadingStatus.value = status
        },
        async (result) => {
          // 智能检测并设置图层
          loadingStatus.value = '正在检测图层...'
          setupLayersFromMapData(result)

          clearMapState({
            points,
            lines,
            bsplines,
            texts,
            areas,
            selectedPoints,
            selectedLines,
            selectedTexts,
            selectedAreas
          })

          await nextTick()

          await applyLoadedResultInBatches({
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
            batchSize: 2000,
            parallel: true
          })

          // 记录 LOAD_MAP：保存 before+after，支持 undo/redo
          record?.(HistoryOp.LOAD_MAP, {
            before: beforeSnapshot,
            after: {
              points: points.value.map(cloneElement),
              lines: lines.value.map(cloneElement),
              bsplines: bsplines.value.map(cloneElement),
              texts: texts.value.map(cloneElement),
              areas: areas.value.map(cloneElement)
            }
          })

          rebuildIdMaps()

          // 数据已写入完毕，先结束 loading，让 DrawingCanvas 的 watcher 不再短路
          isLoading.value = false

          await refreshCanvasAfterLoad(drawingCanvas)

          loadingProgress.value = 1
          loadingStatus.value = '加载完成'
          setTimeout(() => { isLoading.value = false }, 1000)

          if (import.meta.env.DEV) {
            console.log('地图加载完成:', {
              points: points.value.length, lines: lines.value.length,
              bsplines: bsplines.value.length, texts: texts.value.length, areas: areas.value.length
            })
          }
        },
        (error) => {
          console.error('地图加载失败:', error)
          alert('文件加载失败: ' + error.message)
          isLoading.value = false
        }
      )
    } catch (error) {
      console.error('文件处理失败:', error)
      alert('文件处理失败，请检查文件格式')
      isLoading.value = false
    }

    event.target.value = ''
  }

  /** 取消加载进度显示（不回滚已写入数据） */
  const handleCancelLoading = () => {
    isLoading.value = false
    loadingProgress.value = 0
    loadingStatus.value = ''
  }

  // ─── 保存文件 ──────────────────────────────────────────────────────────

  /** 保存本地 JSON 文件 */
  const handleSaveLocal = () => {
    const mapData = buildLocalMapData({
      points: points.value,
      lines: lines.value,
      bsplines: bsplines.value,
      texts: texts.value,
      areas: areas.value,
      resolveLayerName
    })
    downloadJson(mapData, 'map')
  }

  /** 构建后端上传 payload */
  const buildServerPayload = () => buildServerPayloadData({
    points: points.value,
    lines: lines.value,
    bsplines: bsplines.value,
    texts: texts.value,
    areas: areas.value,
    resolveLayerName
  })

  // ─── 上传地图到后端 ────────────────────────────────────────────────────

  const isUploading = ref(false)
  const uploadError = ref('')

  /** 上传地图到后端服务 */
  const handleUploadToServer = async () => {
    if (isUploading.value) return
    try {
      isUploading.value = true
      uploadError.value = ''
      const payload = buildServerPayload()
      const res = await MapAPI.SaveMapData(payload)
      if (!res?.isSuccess) {
        throw new Error(res?.message || '上传失败')
      }
      // 注意：后端 _IMapService.SaveMapData 按 ID upsert，
      // 如需彻底替换地图，请在后端数据库中执行：
      //   DELETE FROM tn_rss_site WHERE cn_s_map_code='rss'
      //   DELETE FROM tn_rss_path WHERE cn_s_map_code='rss'
      // 或联系后端开发开放 ClearMapData 接口
      if (import.meta.env.DEV) {
        console.log('✅ 地图已上传至后端', {
          sites: Object.keys(payload.Sites).length,
          tracks: Object.keys(payload.Tracks).length,
          curves: Object.keys(payload.Curves).length
        })
      }
    } catch (err) {
      uploadError.value = err.message || '上传失败'
      console.error('上传地图失败:', err)
      throw err
    } finally {
      isUploading.value = false
    }
  }

  // ─── 从后端加载地图（页面刷新后恢复）──────────────────────────────────

  /** 从后端拉取地图并恢复到当前编辑器 */
  const loadFromServer = async () => {
    try {
      const res = await MapAPI.GetMapData()
      // 注意：GetMapData 后端只设置 statusCode=200，不设置 isSuccess=true
      // 所以不能用 res?.isSuccess，改为检查 statusCode
      if (!res || (res.statusCode !== 200 && res.isSuccess !== true)) return

      // GetMapData 返回的 data 是二次序列化的 JSON 字符串
      let mapData = res.data
      if (typeof mapData === 'string') {
        try { mapData = JSON.parse(mapData) } catch { return }
      }
      if (!mapData) return

      // 复用 MapLoader 的解析逻辑
      const totalWork = (
        (mapData.Sites  ? Object.keys(mapData.Sites).length  : 0) +
        (mapData.Tracks ? Object.keys(mapData.Tracks).length : 0) +
        (mapData.Curves ? Object.keys(mapData.Curves).length : 0) +
        (mapData.Text   ? Object.keys(mapData.Text).length   : 0) +
        (mapData.Area   ? Object.keys(mapData.Area).length   : 0)
      )
      if (totalWork === 0) return  // 后端地图为空，不覆盖本地状态

      isLoading.value = true
      loadingProgress.value = 0
      loadingStatus.value = '正在从后端读取地图...'
      loadingStartTime.value = Date.now()

      await new Promise((resolve, reject) => {
        MapLoader.loadMapFromData(
          mapData,
          (progress, status) => {
            loadingProgress.value = progress
            loadingStatus.value = status
          },
          resolve,
          reject
        )
      }).then(async (result) => {
        loadingStatus.value = '正在检测图层...'
        setupLayersFromMapData(result)

        clearMapState({
          points,
          lines,
          bsplines,
          texts,
          areas,
          selectedPoints,
          selectedLines,
          selectedTexts,
          selectedAreas
        })

        await nextTick()

        await applyLoadedResultInBatches({
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
          batchSize: 2000,
          parallel: false
        })

        rebuildIdMaps?.()
        await refreshCanvasAfterLoad(drawingCanvas, { clearPointCache: true })

        loadingProgress.value = 1
        loadingStatus.value = '加载完成'
        isLoading.value = false
        setTimeout(() => { isLoading.value = false }, 500)
        if (import.meta.env.DEV) console.log('地图从后端加载完成:', {
          points: result.points.length, lines: result.lines.length,
          bsplines: result.bsplines.length
        })
      })
    } catch (err) {
      // 网络不通或后端未启动时静默忽略，不影响正常使用
      isLoading.value = false
      if (import.meta.env.DEV) console.warn('从后端加载地图失败（可能后端未启动）:', err.message)
    }
  }

  return {
    isLoading,
    loadingProgress,
    loadingStatus,
    loadedCount,
    estimatedTime,
    getSiteType,
    handleUploadMap,
    handleFileSelected,
    handleSaveLocal,
    handleCancelLoading,
    // 服务器上传 / 加载
    isUploading,
    uploadError,
    handleUploadToServer,
    loadFromServer,
    buildServerPayload,
    // 图层检测方法
    detectLayersFromMapData,
    setupLayersFromMapData
  }
}
