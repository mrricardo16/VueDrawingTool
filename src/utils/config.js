/**
 * 运行时配置管理
 * 优先级：外部config.js > URL参数 > 默认配置
 */

// 默认配置
const defaultConfig = {
    API_BASE_URL: 'http://localhost:8222/api',
    API_TOKEN: '',
    MAIN_SYSTEM_URL: 'http://localhost:8225',  // RSS_UI主系统地址
    DEBUG_MODE: false,
    APP_TITLE: 'RSS画图工具'
};

// 从外部配置文件读取
function getExternalConfig() {
    if (window.WebtoolConfig) {
        return window.WebtoolConfig;
    }
    return {};
}

// 从URL参数读取
function getUrlConfig() {
    const params = new URLSearchParams(window.location.search);
    const config = {};
    
    if (params.get('api')) {
        config.API_BASE_URL = params.get('api');
    }
    if (params.get('token')) {
        config.API_TOKEN = params.get('token');
    }
    if (params.get('debug')) {
        config.DEBUG_MODE = params.get('debug') === 'true';
    }
    
    return config;
}

// 合并配置
export function getRuntimeConfig() {
    const external = getExternalConfig();
    const urlConfig = getUrlConfig();
    
    return {
        ...defaultConfig,
        ...external,
        ...urlConfig
    };
}

// 调试信息
export function logConfigInfo() {
    const config = getRuntimeConfig();
    console.log('🔧 RSS画图工具配置信息:');
    console.log('- API地址:', config.API_BASE_URL);
    console.log('- Token:', config.API_TOKEN ? '已设置' : '未设置');
    console.log('- RSS_UI主系统地址:', config.MAIN_SYSTEM_URL);
    console.log('- 调试模式:', config.DEBUG_MODE);
    
    // 检测实际配置来源
    let actualSource = '默认配置';
    if (window.WebtoolConfig) actualSource = '外部config.js';
    else if (window.location.search !== '') actualSource = 'URL参数';
    else if (import.meta.env.VITE_API_BASE_URL) actualSource = '.env.local';
    
    console.log('- 实际配置来源:', actualSource);
    console.log('- 配置详情:', {
        '外部文件': !!window.WebtoolConfig,
        'URL参数': window.location.search !== '',
        '环境变量': !!import.meta.env.VITE_API_BASE_URL,
        'RSS_UI主系统': !!window.RssConfig,
        'localStorage': !!localStorage.getItem('rss_api')
    });
}
