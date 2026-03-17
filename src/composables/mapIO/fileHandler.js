/**
 * useMapIO 文件处理工具
 */

/**
 * @param {HTMLInputElement|{value?:HTMLInputElement}|null|undefined} fileInput
 */
export function triggerFileSelect(fileInput) {
  const el = fileInput?.value ? fileInput.value : fileInput
  el?.click()
}

/**
 * @param {any} data
 * @param {string} [filenamePrefix='map']
 */
export function downloadJson(data, filenamePrefix = 'map') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
