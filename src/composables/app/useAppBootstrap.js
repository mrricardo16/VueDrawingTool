import { onMounted, onUnmounted } from 'vue'

/**
 * App 启动与全局监听流程
 * - 启动时加载地图
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

  onMounted(() => {
    document.addEventListener('click', handleClickOutside)

    if (typeof mapStore.tryAutoLoadFromServer === 'function') {
      mapStore.tryAutoLoadFromServer()
    } else {
      mapStore.loadFromServer()
    }
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
}
