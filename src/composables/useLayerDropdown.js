import { ref } from 'vue'

/**
 * @typedef {{
 * toggleLayerVisibility:(layerId:string)=>void,
 * addLayer:(name:string)=>any
 * }} LayerStoreLike
 */

/**
 * @param {LayerStoreLike} layerStore
 */
export function useLayerDropdown(layerStore) {
  const isOpen = ref(false)
  const showDialog = ref(false)
  const newLayerName = ref('')
  const layerNameInput = ref(null)

  /** 切换图层下拉面板 */
  const toggleDropdown = () => {
    isOpen.value = !isOpen.value
  }

  /** @param {string} layerId */
  const toggleLayerVisibility = (layerId) => {
    layerStore.toggleLayerVisibility(layerId)
  }

  /** 打开新增图层弹窗并聚焦输入框 */
  const showAddLayerDialog = () => {
    showDialog.value = true
    isOpen.value = false
    setTimeout(() => layerNameInput.value?.focus(), 0)
  }

  /** 关闭新增图层弹窗 */
  const closeDialog = () => {
    showDialog.value = false
    newLayerName.value = ''
  }

  /** 新增图层（忽略空名称） */
  const addLayer = () => {
    const name = newLayerName.value.trim()
    if (!name) return

    layerStore.addLayer(name)
    closeDialog()
  }

  /** @param {MouseEvent} event */
  const handleClickOutside = (event) => {
    if (!event.target.closest('.layer-dropdown')) {
      isOpen.value = false
    }
  }

  return {
    isOpen,
    showDialog,
    newLayerName,
    layerNameInput,
    toggleDropdown,
    toggleLayerVisibility,
    showAddLayerDialog,
    closeDialog,
    addLayer,
    handleClickOutside
  }
}
