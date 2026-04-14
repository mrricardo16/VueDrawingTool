/**
 * App 级上传相关动作
 * @param {any} mapStore
 * @param {any} fileInput
 * @param {(options?:{message?:string,type?:string,duration?:number,title?:string,position?:any})=>void} showToast
 */
export function useUploadActions(mapStore, fileInput, showToast) {
  const handleUploadMap = () => {
    const el = fileInput.value
    if (el?.click) el.click()
    else mapStore.handleUploadMap(fileInput.value)
  }

  const handleUploadToServer = async () => {
    try {
      await mapStore.handleUploadToServer()
      showToast({ message: '地图已成功上传至后端 ✓', type: 'success', duration: 3000 })
      // 上传后从后端重新加载，确保画图工具显示的是后端实际保存的数据（强制刷新）
      await mapStore.loadFromServer({ force: true })
    } catch (err) {
      showToast({ message: '上传失败：' + (err.message || '未知错误'), type: 'error', duration: 5000 })
    }
  }

  return {
    handleUploadMap,
    handleUploadToServer
  }
}
