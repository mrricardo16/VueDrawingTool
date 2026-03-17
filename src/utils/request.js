/**
 * RSS画图工具HTTP请求模块
 * 配置优先级（从高到低）：
 *   1. URL参数            ?api=http://...&token=xxx
 *   2. RSS_UI主系统config.js注入  window.RssConfig
 *   3. localStorage       rss_api / rss_token（持久化，上次配置自动记住）
 *   4. 外部config.js      /config.js (生产环境优先)
 *   5. .env.local         VITE_API_BASE_URL / VITE_API_TOKEN（开发环境备用）
 */
import axios from 'axios'
import { getRuntimeConfig as getNewRuntimeConfig } from './config.js'

function getRuntimeConfig() {
  // 1. 使用新的配置系统
  const newConfig = getNewRuntimeConfig()
  
  // 2. 兼容旧的配置方式
  const params = new URLSearchParams(window.location.search)
  const urlApi   = params.get('api')
  const urlToken = params.get('token')

  const winApi   = window.RssConfig?.RSSApi   || window.rssApi  // RSS_UI主系统配置
  const winToken = window.RssConfig?.RSSToken || window.rssToken  // RSS_UI主系统配置

  const storedApi   = localStorage.getItem('rss_api')
  const storedToken = localStorage.getItem('rss_token')

  const envApi   = import.meta.env.VITE_API_BASE_URL
  const envToken = import.meta.env.VITE_API_TOKEN

  return {
    baseURL: urlApi           // 1. URL参数 (最高)
           || winApi          // 2. RSS_UI主系统配置
           || storedApi       // 3. localStorage缓存
           || newConfig.API_BASE_URL  // 4. 外部config.js (生产环境优先)
           || envApi          // 5. .env.local (开发环境备用)
           || '',
    token: urlToken
           || winToken
           || storedToken
           || newConfig.API_TOKEN     // 4. 外部config.js (生产环境优先)
           || envToken        // 5. .env.local (开发环境备用)
           || ''
  }
}

const request = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器：动态注入 baseURL 和 token
request.interceptors.request.use(
  (config) => {
    const { baseURL, token } = getRuntimeConfig()

    if (baseURL && config.url && !config.url.startsWith('http')) {
      config.url = baseURL.replace(/\/$/, '') + config.url
    }

    if (token) {
      config.headers['token'] = token
    }

    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const { response } = error
    if (response) {
      if (response.status === 401 || response.status === 403) {
        console.warn('[webtool] token 无效或已过期')
      }
    } else if (error.request) {
      console.error('[webtool] 网络错误，无法连接后端:', error.message)
    }
    return Promise.reject(error)
  }
)

export default request

export function setApiConfig(api, token) {
  if (api)   localStorage.setItem('rss_api',   api)
  if (token) localStorage.setItem('rss_token', token)
}

export { getRuntimeConfig }
