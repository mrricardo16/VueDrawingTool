import { onMounted, onUnmounted } from 'vue'

/**
 * App 启动与全局监听流程
 * - 外部配置消息接入
 * - 启动时加载地图
 * - 通知父窗口工具就绪
 * - 预留全局点击处理
 * @param {{loadFromServer:()=>Promise<any>|any}} mapStore
 */
export function useAppBootstrap(mapStore) {
  /** @param {MouseEvent} event */
  const handleClickOutside = (event) => {
    if (!event.target.closest('.selection-dropdown')) {
      // dropdown 由 DrawingTools 内部管理
    }
  }

  /** @param {MessageEvent} event */
  const handleMessage = (event) => {
    const data = event.data
    if (!data || typeof data !== 'object') return

    if (data.type === 'rss-config' || data.type === 'config') {
      const { api, token, RSSApi, RSSToken } = data.payload || data
      const apiUrl = api || RSSApi
      const apiToken = token || RSSToken
      if (apiUrl) localStorage.setItem('rss_api', apiUrl)
      if (apiToken) localStorage.setItem('rss_token', apiToken)
      mapStore.loadFromServer()
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('message', handleMessage)

    if (window.parent !== window) {
      window.parent.postMessage({ type: 'tool-ready' }, '*')
    }

    mapStore.loadFromServer()
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    window.removeEventListener('message', handleMessage)
  })
}
