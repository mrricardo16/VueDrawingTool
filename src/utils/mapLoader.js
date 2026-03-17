/**
 * 高性能地图数据加载器
 * 解决大文件上传卡死问题
 */

export class MapLoader {
  constructor() {
    this.chunkSize = 200 // 增加每批处理的数据量
    this.loadDelay = 5 // 减少批次间延迟(ms)
  }

  _normId(v) {
    // 兼容 JSON 中 id/siteA/siteB 可能为数字或数字字符串的情况
    if (typeof v === 'string') {
      const s = v.trim()
      if (s !== '' && !Number.isNaN(Number(s))) return Number(s)
      return v
    }
    return v
  }

  _normNum(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  /**
   * 从已解析的对象加载地图（供服务端数据使用，跳过文件读取步骤）
   * @param {Object} mapData - 已解析的 _RobotProjectModel 对象
   * @param {Function} onProgress - 进度回调，参数：(进度百分比, 当前阶段描述)
   * @param {Function} onComplete - 完成回调，参数：结果对象
   * @param {Function} onError - 错误回调，参数：异常对象
   * @returns {Promise<void>} 异步无返回
   */
  async loadMapFromData(mapData, onProgress, onComplete, onError) {
    try {
      const totalWork = this.calculateTotalWork(mapData)
      let completedWork = 0

      const result = { points: [], lines: [], bsplines: [], texts: [], areas: [] }
      const curveIdSet = mapData.Curves
        ? new Set(Object.keys(mapData.Curves).map(id => this._normId(id)))
        : null

      if (mapData.Sites) {
        const sites = Object.values(mapData.Sites)
        for (let i = 0; i < sites.length; i += this.chunkSize) {
          const chunk = sites.slice(i, i + this.chunkSize)
          result.points.push(...this.processSitesChunk(chunk))
          completedWork += chunk.length
          onProgress?.(completedWork / totalWork, '正在加载站点...')
          await this.yieldControl()
        }
      }

      if (mapData.Tracks) {
        const tracks = Object.values(mapData.Tracks)
        for (let i = 0; i < tracks.length; i += this.chunkSize) {
          const chunk = tracks.slice(i, i + this.chunkSize)
          result.lines.push(...this.processTracksChunk(chunk, curveIdSet))
          completedWork += chunk.length
          onProgress?.(completedWork / totalWork, '正在加载路径...')
          await this.yieldControl()
        }
      }

      if (mapData.Curves) {
        const curves = Object.values(mapData.Curves)
        for (let i = 0; i < curves.length; i += this.chunkSize) {
          const chunk = curves.slice(i, i + this.chunkSize)
          result.bsplines.push(...this.processCurvesChunk(chunk))
          completedWork += chunk.length
          onProgress?.(completedWork / totalWork, '正在加载曲线...')
          await this.yieldControl()
        }
      }

      if (mapData.Text) {
        const texts = Object.values(mapData.Text)
        for (let i = 0; i < texts.length; i += this.chunkSize) {
          const chunk = texts.slice(i, i + this.chunkSize)
          result.texts.push(...this.processTextsChunk(chunk))
          completedWork += chunk.length
          onProgress?.(completedWork / totalWork, '正在加载文本...')
          await this.yieldControl()
        }
      }

      if (mapData.Area) {
        const areas = Object.values(mapData.Area)
        for (let i = 0; i < areas.length; i += this.chunkSize) {
          const chunk = areas.slice(i, i + this.chunkSize)
          result.areas.push(...this.processAreasChunk(chunk))
          completedWork += chunk.length
          onProgress?.(completedWork / totalWork, '正在加载区域...')
          await this.yieldControl()
        }
      }

      onComplete?.(result)
    } catch (error) {
      onError?.(error)
    }
  }

  /**
   * 异步加载地图数据
   * @param {File} file - 地图文件
   * @param {Function} onProgress - 进度回调
   * @param {Function} onComplete - 完成回调
   * @param {Function} onError - 错误回调
   */
  async loadMapAsync(file, onProgress, onComplete, onError) {
    try {
      const mapData = await this.readFileAsync(file)
      await this.loadMapFromData(mapData, onProgress, onComplete, onError)
    } catch (error) {
      onError?.(error)
    }
  }

  /**
   * 异步读取文件
   */
  readFileAsync(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const mapData = JSON.parse(e.target.result)
          resolve(mapData)
        } catch (error) {
          reject(new Error('JSON解析失败: ' + error.message))
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  /**
   * 计算总工作量
   */
    calculateTotalWork(mapData) {
      let total = 0
      if (mapData.Sites) total += Object.keys(mapData.Sites).length
      if (mapData.Tracks) total += Object.keys(mapData.Tracks).length
      if (mapData.Curves) total += Object.keys(mapData.Curves).length
      if (mapData.Text) total += Object.keys(mapData.Text).length
      if (mapData.Area) total += Object.keys(mapData.Area).length
      return total
    }

    /**
     * 处理站点数据块
     */
    processSitesChunk(sites) {
      return sites.map(site => ({
        id: this._normId(site.id),
        name: site.name || '',
        x: this._normNum(site.x),
        y: this._normNum(site.y),
        color: site.color || '#B8C5D6',
        angle: this._normNum(site.angle),
        type: this.getSiteType(site.fields),
        layername: site.layername || site.layerName || 'g',
        fields: site.fields || {},
        mustFree: site.mustFree || []
      }))
    }

    /**
     * 处理路径数据块
     */
    processTracksChunk(tracks, curveIdSet = null) {
      return tracks
        .filter(track => {
          const normalizedTrackId = this._normId(track.id)
          if (curveIdSet?.has(normalizedTrackId)) {
            return false
          }

          const trackType = Number(track.trackType)
          if (Number.isFinite(trackType)) {
            return trackType === 1
          }

          // 兼容历史数据：没有 trackType 时，通过控制点/阶数字段判断是否曲线
          return !this._looksLikeCurveTrack(track)
        })
        .map(track => {
          const direction = Number(track.direction)
          const siteA = this._normId(track.siteA ?? track._siteA ?? track.StartSite)
          const siteB = this._normId(track.siteB ?? track._siteB)
          const isReverse = direction === 2

          return {
            id: this._normId(track.id),
            startPointId: isReverse ? siteB : siteA,
            endPointId: isReverse ? siteA : siteB,
            mode: direction === 0 ? 'bidirectional' : 'single',
            name: track.name || 'NoName',
            layername: track.layerName || track.layername || 'g',
            fields: track.fields || {},
            mustFree: track.mustFree || [],
            _direction: direction
          }
        })
    }

    /**
     * 历史兼容：某些地图将曲线也放在 Tracks，且未标注 trackType
     * @param {Record<string, any>} track
     * @returns {boolean}
     */
    _looksLikeCurveTrack(track) {
      if (!track || typeof track !== 'object') return false
      if (track.Order !== undefined) return true
      if (track.order !== undefined) return true

      const cps = track.ControlPoints
      if (Array.isArray(cps)) return cps.length > 0
      if (typeof cps === 'string') {
        const trimmed = cps.trim()
        if (!trimmed) return false
        if (trimmed === '[]') return false
        return true
      }

      return false
    }

    /**
     * 处理曲线数据块
     */
    processCurvesChunk(curves) {
      return curves
        .filter(curve => curve.trackType === 3)
        .map(curve => {
          const controlPoints = this.parseControlPoints(curve)
          // direction=2 反向：交换 start/end 并翻转控制点顺序
          const isReverse = curve.direction === 2
          const finalCPs = isReverse ? [...controlPoints].reverse() : controlPoints
          return {
            id: this._normId(curve.id),
            startPointId: isReverse ? this._normId(curve.siteB) : this._normId(curve.siteA),
            endPointId:   isReverse ? this._normId(curve.siteA) : this._normId(curve.siteB),
            controlPoints: finalCPs,
            controlPointIds: finalCPs.map(cp => cp.id),
            params: {},
            mode: curve.direction === 0 ? 'bidirectional' : 'single',
            name: curve.name || 'NoName',
            color: curve.color || '',
            angle: curve.angle || 0.0,
            layername: curve.layerName || curve.layername || 'g',
            fields: curve.fields || {},
            mustFree: curve.mustFree || [],
            _direction: curve.direction
          }
        })
    }

    /**
     * 处理文本数据块
     */
    processTextsChunk(texts) {
      return texts.map(text => ({
        id: this._normId(text.id),
        name: text.name || '',
        x: this._normNum(text.x),
        y: this._normNum(text.y),
        color: text.color || '#ffffff',
        fontSize: text.fontSize || 36,
        angle: text.angle || 0.0,
        layername: text.layername || text.layerName || 'g',
        fields: text.fields || {},
        mustFree: text.mustFree || []
      }))
    }

    /**
     * 处理区域数据块
     */
    processAreasChunk(areas) {
      return areas.map(area => ({
        id: this._normId(area.id),
        layerName: area.layerName || 'g',
        name: area.name || 'NoName',
        opacity: area.opacity || 50,
        color: area.color || '#FFFFFF',
        fields: area.fields || {},
        carNum: area.carNum || 0,
        points: area.points || []
      }))
    }

    /**
     * 解析控制点
     */
    parseControlPoints(curve) {
      if (!curve.ControlPoints) return []

      if (typeof curve.ControlPoints === 'string') {
        try {
          const parsed = JSON.parse(curve.ControlPoints)
          return parsed.map((cp, index) => ({
            id: `cp_${curve.id}_${index}`,
            x: cp.x,
            y: cp.y
          }))
        } catch (e) {
          console.warn('解析控制点失败:', e)
          return []
        }
      } else if (Array.isArray(curve.ControlPoints)) {
        return curve.ControlPoints.map((cp, index) => ({
          id: `cp_${curve.id}_${index}`,
          x: cp.x,
          y: cp.y
        }))
      }
      return []
    }

    /**
     * 获取站点类型
     */
    getSiteType(fields) {
      if (!fields) return 'point'
      if (fields.charge === 'true') return 'charging'
      if (fields.standby === 'true') return 'rest'
      if (fields.shelf === 'true') return 'site'
      if (fields.escape === 'true') return 'escape'
      if (fields.stagingSite === 'true') return 'staging'
      return 'point'
    }

    /**
     * 让出控制权，避免阻塞UI
     */
    yieldControl() {
      return new Promise(resolve => {
        requestAnimationFrame(resolve)
      }
      )
    }
}

export default new MapLoader()
