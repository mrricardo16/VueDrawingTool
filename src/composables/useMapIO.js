/**
 * useMapIO.js
 *
 * 优化注释：
 * - 增加了模块职责的简洁说明。
 * - 为依赖项和方法补充了更详细的参数和返回值描述。
 * - 对异步加载流程的关键步骤进行了注释。
 */

import { ref, computed, nextTick } from 'vue'
import MapLoader from '../utils/mapLoader.js'
import { initIdCounter } from '../utils/idGenerator.js'
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
 * 依赖项说明：
 * - points/lines/bsplines/texts/areas: 地图要素的响应式数据。
 * - selectedPoints/selectedLines/...: 当前选中的要素。
 * - record: 历史记录操作函数。
 * - HistoryOp: 历史操作类型。
 * - cloneElement: 克隆元素的工具函数。
 * - drawingCanvas: 画布实例。
 * - rebuildIdMaps: ID 映射重建函数。
 */

/**
 * 方法说明：
 * - setupLayersFromMapData: 从地图数据中智能设置图层。
 * - resolveLayerName: 根据图层存储解析图层名称。
 * - handleUploadMap: 触发文件选择对话框。
 * - handleFileSelected: 处理文件选择事件并加载地图数据。
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

  /**
   * 异步扫描加载结果以计算最大 ID，并调用 initIdCounter。
   * 使用分块（setTimeout）以避免阻塞 UI 主线程。
   * @param {{points?:any[], lines?:any[], bsplines?:any[], texts?:any[], areas?:any[]}} result
   * @returns {Promise<number>} 返回发现的最大 ID
   */
  async function initCounterFromResult(result) {
    if (!result || typeof result !== 'object') return 0
    const pointsArr = result.points || []
    const linesArr = result.lines || []
    const bsplinesArr = result.bsplines || []
    const textsArr = result.texts || []
    const areasArr = result.areas || []
    const all = pointsArr.concat(linesArr, bsplinesArr, textsArr, areasArr)

    return new Promise((resolve) => {
      let maxId = 0
      const chunkSize = 5000
      let i = 0
      const len = all.length

      const process = () => {
        const end = Math.min(i + chunkSize, len)
        for (; i < end; i++) {
          const el = all[i]
          if (!el) continue
          const id = parseInt(el.id, 10)
          if (!Number.isNaN(id) && Number.isFinite(id)) {
            if (id > maxId) maxId = id
          }
        }
        if (i < len) {
          setTimeout(process, 0)
        } else {
          try { initIdCounter(maxId) } catch (e) { console.warn('initIdCounter failed', e) }
          resolve(maxId)
        }
      }
      process()
    })
  }

  /**
   * 从不同后端返回形态中提取字段，兼容大小写差异。
   * @param {Record<string, any>|null|undefined} obj
   * @param {string[]} names
   */
  const pickField = (obj, names) => {
    if (!obj || typeof obj !== 'object') return undefined
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(obj, name) && obj[name] !== undefined) {
        return obj[name]
      }
    }
    const lowerMap = Object.keys(obj).reduce((acc, key) => {
      acc[key.toLowerCase()] = obj[key]
      return acc
    }, {})
    for (const name of names) {
      const v = lowerMap[name.toLowerCase()]
      if (v !== undefined) return v
    }
    return undefined
  }

  /**
   * 统一地图结构为 `MapLoader` 期望的 `_RobotProjectModel` 形态。
   * 兼容 `Sites/sites`、`Tracks/tracks` 等大小写差异。
   * @param {any} mapData
   */
  const normalizeMapData = (mapData) => {
    if (!mapData || typeof mapData !== 'object') return mapData
    return {
      Sites: pickField(mapData, ['Sites']) || pickField(mapData, ['sites']) || {},
      Tracks: pickField(mapData, ['Tracks']) || pickField(mapData, ['tracks']) || {},
      Curves: pickField(mapData, ['Curves']) || pickField(mapData, ['curves']) || {},
      Text: pickField(mapData, ['Text']) || pickField(mapData, ['text']) || {},
      Area: pickField(mapData, ['Area']) || pickField(mapData, ['area']) || {}
    }
  }

  /**
   * 从响应对象中尽可能提取地图有效载荷。
   * 兼容 mapData/data/Data/result/Result 等字段，并支持 JSON 字符串二次解析。
   * @param {any} res
   */
  const extractMapPayload = (res) => {
    let payload = pickField(res, ['data', 'Data', 'result', 'Result', 'mapData', 'MapData', 'payload', 'Payload'])

    if (payload === undefined && res && typeof res === 'object') {
      if (pickField(res, ['Sites', 'Tracks', 'Curves', 'Text', 'Area']) !== undefined) {
        payload = res
      }
    }

    let depth = 0
    while (typeof payload === 'string' && depth < 2) {
      try {
        payload = JSON.parse(payload)
      } catch {
        break
      }
      depth += 1
    }

    if (payload && typeof payload === 'object') {
      const nested = pickField(payload, ['data', 'Data', 'result', 'Result', 'mapData', 'MapData'])
      if (nested !== undefined && nested !== payload) {
        return extractMapPayload(nested)
      }
    }

    return payload
  }

  /**
   * 判断响应是否成功。
   * @param {any} res
   */
  const isOkResponse = (res) => {
    if (!res || typeof res !== 'object') return false
    const statusCode = pickField(res, ['statusCode', 'StatusCode'])
    const isSuccess = pickField(res, ['isSuccess', 'IsSuccess', 'success', 'Success'])
    const code = pickField(res, ['code', 'Code'])

    if (isSuccess === true) return true
    if (Number(statusCode) === 200) return true
    if (String(code) === '00000' || Number(code) === 0 || Number(code) === 200) return true

    // 某些接口只返回 payload，本身就是地图对象
    if (pickField(res, ['Sites', 'Tracks', 'Curves', 'Text', 'Area']) !== undefined) return true

    return false
  }

  /**
   * 将后端响应解析为规范地图对象。
   * @param {any} res
   */
  const parseMapDataFromResponse = (res) => {
    if (!isOkResponse(res)) return null
    const payload = extractMapPayload(res)
    if (!payload || typeof payload !== 'object') return null
    return normalizeMapData(payload)
  }

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

          // 在批量写入前异步初始化 ID 计数器，避免阻塞主线程
          await initCounterFromResult(result)

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
      console.info('[MapIO] loadFromServer start', { ts: Date.now() })
      // 主接口：MapHis/GetMapData
      console.info('[MapIO] calling MapAPI.GetMapData')
      const res = await MapAPI.GetMapData()
      let mapData = parseMapDataFromResponse(res)

      // 回退接口：MapHis/GetMap（某些生产环境仅该接口有数据）
      if (!mapData) {
        console.info('[MapIO] GetMapData returned no payload, calling fallback GetMap')
        const fallbackRes = await MapAPI.GetMap()
        mapData = parseMapDataFromResponse(fallbackRes)
      }

      if (!mapData) {
        console.info('[MapIO] no mapData found after fallback')
        return false
      }

      // 复用 MapLoader 的解析逻辑
      const totalWork = (
        (mapData.Sites  ? Object.keys(mapData.Sites).length  : 0) +
        (mapData.Tracks ? Object.keys(mapData.Tracks).length : 0) +
        (mapData.Curves ? Object.keys(mapData.Curves).length : 0) +
        (mapData.Text   ? Object.keys(mapData.Text).length   : 0) +
        (mapData.Area   ? Object.keys(mapData.Area).length   : 0)
      )
      if (totalWork === 0) {
        console.info('[MapIO] backend map empty (totalWork=0)')
        return false
      }

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

        // 异步初始化 ID 计数器，基于加载的数据计算最大 ID
        await initCounterFromResult(result)

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
        console.info('[MapIO] loadFromServer finished successfully', { points: result.points.length, lines: result.lines.length })
        return true
      })
    } catch (err) {
      // 网络不通或后端未启动时静默忽略，不影响正常使用
      isLoading.value = false
      if (import.meta.env.DEV) console.warn('从后端加载地图失败（可能后端未启动）:', err.message)
    }
    console.info('[MapIO] loadFromServer end (no load)')
    return false
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
