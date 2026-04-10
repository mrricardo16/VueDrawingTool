/**
 * RSS画图工具HTTP请求模块（主项目内集成模式）
 * 配置优先级（从高到低）：
 *   1. 主项目 window.RssConfig
 *   2. 登录态 sessionStorage(access_token)
 *   3. localStorage（兼容历史数据）
 *   4. .env 兜底
 */
import axios from 'axios';
import { getAccessToken } from '@/utils/auth';

function getRuntimeConfig() {
  const winApi = window.RssConfig?.RSSApi || window.rssApi
  const winToken = window.RssConfig?.RSSToken || window.rssToken
  const sessionToken = getAccessToken?.() || ''

  const storedApi   = localStorage.getItem('rss_api')
  const storedToken = localStorage.getItem('rss_token')

  const envApi   = import.meta.env.VITE_API_BASE_URL
  const envToken = import.meta.env.VITE_API_TOKEN

  const originApi = typeof window !== 'undefined'
    ? `${window.location.origin.replace(/\/$/, '')}/api`
    : ''

  return {
      baseURL: winApi
        || storedApi
        || envApi
        || originApi
           || '',
      token: sessionToken
        || winToken
        || storedToken
        || envToken
           || ''
  }
}

const axiosInstance = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// 跨模块去重：使用 window 上的共享 map，避免在嵌入或 HMR 场景中重复发起相同请求
if (typeof window !== 'undefined' && !window.__INFLIGHT_REQUESTS) {
  window.__INFLIGHT_REQUESTS = new Map();
}

// 请求拦截器：动态注入 baseURL 和 token
axiosInstance.interceptors.request.use(
  (config) => {
    const { baseURL, token } = getRuntimeConfig();

    if (baseURL && config.url && !config.url.startsWith('http')) {
      config.url = baseURL.replace(/\/$/, '') + config.url;
    }

    if (token) {
      config.headers['token'] = token;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const { response } = error;
    if (response) {
      if (response.status === 401 || response.status === 403) {
        console.warn('[webtool] token 无效或已过期');
      }
    } else if (error.request) {
      console.error('[webtool] 网络错误，无法连接后端:', error.message);
    }
    return Promise.reject(error);
  }
);

// 导出一个请求包装器，支持相同的用法：调用 request(config)
const request = function(config) {
  const key = `${(config.method||'get').toLowerCase()}::${config.url}::${JSON.stringify(config.data||config.params||{})}`;
  const inflight = (typeof window !== 'undefined' && window.__INFLIGHT_REQUESTS) ? window.__INFLIGHT_REQUESTS : null;
  if (inflight && inflight.has(key)) {
    return inflight.get(key);
  }
  const p = axiosInstance.request(config).finally(() => {
    if (inflight) inflight.delete(key);
  });
  if (inflight) inflight.set(key, p);
  return p;
};

export default request;

export function setApiConfig(api, token) {
  if (api)   localStorage.setItem('rss_api',   api)
  if (token) localStorage.setItem('rss_token', token)
}

export { getRuntimeConfig }
