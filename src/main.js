/**
 * 应用程序主入口文件
 * 负责创建Vue应用实例并挂载到DOM
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 创建Vue应用实例
const app = createApp(App)

// 状态管理
app.use(createPinia())

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('全局错误:', err)
  console.error('错误信息:', info)
  // 这里可以添加错误上报逻辑
}

// 性能监控（开发环境）
if (process.env.NODE_ENV === 'development') {
  app.config.performance = true
}

// 挂载应用到DOM
app.mount('#app')
