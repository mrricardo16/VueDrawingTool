/**
 * Draw 配置兼容层（主项目内集成模式）
 * 仅保留主项目配置与环境变量兜底，不再读取 URL 参数和 WebtoolConfig。
 */

export function getRuntimeConfig() {
  return {
    API_BASE_URL: window.RssConfig?.RSSApi || import.meta.env.VITE_API_BASE_URL || '',
    API_TOKEN: window.RssConfig?.RSSToken || import.meta.env.VITE_API_TOKEN || '',
    DEBUG_MODE: import.meta.env.DEV === true,
    APP_TITLE: window.RssConfig?.title || 'RSS画图工具'
  }
}

export function logConfigInfo() {
  const config = getRuntimeConfig()
  console.log('🔧 Draw 配置（主项目集成）:', {
    API_BASE_URL: config.API_BASE_URL,
    API_TOKEN: config.API_TOKEN ? '已设置' : '未设置',
    DEBUG_MODE: config.DEBUG_MODE,
    APP_TITLE: config.APP_TITLE
  })
}
