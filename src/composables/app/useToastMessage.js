import { ref } from 'vue'

/**
 * App 级 Toast 状态与操作
 */
export function useToastMessage() {
  const toastVisible = ref(false)
  const toastType = ref('error')
  const toastTitle = ref('提示')
  const toastMessage = ref('')
  const toastDuration = ref(3000)
  const toastPosition = ref({ top: 20, right: 20 })

  /**
   * @param {{
   * type?:'success'|'error'|'warning'|'info'|string,
   * title?:string,
   * message?:string,
   * duration?:number,
   * position?:{top?:number,right?:number,left?:number,bottom?:number}
   * }} [options]
   */
  const showToast = (options = {}) => {
    toastType.value = options.type || 'error'
    toastTitle.value = options.title || '提示'
    toastMessage.value = options.message || ''
    toastDuration.value = options.duration || 3000
    toastPosition.value = options.position || { top: 20, right: 20 }
    toastVisible.value = true
  }

  const hideToast = () => {
    toastVisible.value = false
  }

  /** @param {any} options */
  const handleShowToast = (options) => {
    showToast(options)
  }

  return {
    toastVisible,
    toastType,
    toastTitle,
    toastMessage,
    toastDuration,
    toastPosition,
    showToast,
    hideToast,
    handleShowToast
  }
}
