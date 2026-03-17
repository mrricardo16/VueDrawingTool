/**
 * MouseEventHandler 文本编辑管理器
 * 负责 input DOM 的创建、提交与清理，降低组件方法复杂度。
 *
 * @typedef {import('../../models/types').TextElement} TextElement
 * @typedef {Object} TextEditingManagerVM
 * @property {HTMLInputElement|null} textInput
 * @property {boolean} isTextEditing
 * @property {TextElement|null} currentText
 * @property {(event:string, payload:any)=>void} $emit
 */

/**
 * @param {TextEditingManagerVM} vm
 * @param {Document} [documentRef]
 */
export function createMouseTextEditingManager(vm, documentRef = document) {
  function removeExistingInput() {
    if (vm.textInput && vm.textInput.parentNode) {
      vm.textInput.parentNode.removeChild(vm.textInput)
    }
    vm.textInput = null
  }

  function cleanupTextInput() {
    removeExistingInput()
    vm.isTextEditing = false
    vm.currentText = null
  }

  function finishTextEditing() {
    if (vm.textInput && vm.currentText) {
      vm.$emit('text-added', {
        ...vm.currentText,
        name: vm.textInput.value || vm.currentText.name
      })
    }
    cleanupTextInput()
  }

  function cancelTextEditing() {
    cleanupTextInput()
  }

  /**
   * @param {TextElement} text
   */
  function createTextInput(text) {
    removeExistingInput()

    const input = documentRef.createElement('input')
    input.type = 'text'
    input.value = text.name

    Object.assign(input.style, {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      fontSize: '20px',
      color: text.color,
      background: 'rgba(0,0,0,0.8)',
      border: '1px solid #4299e1',
      padding: '4px 8px',
      borderRadius: '4px',
      zIndex: '10000',
      outline: 'none'
    })

    input.addEventListener('blur', finishTextEditing)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishTextEditing()
      } else if (e.key === 'Escape') {
        cancelTextEditing()
      }
    })

    documentRef.body.appendChild(input)
    input.focus()
    input.select()
    vm.textInput = input
  }

  /**
   * @param {TextElement} text
   */
  function startTextEditing(text) {
    vm.currentText = text
    vm.isTextEditing = true
    createTextInput(text)
  }

  return {
    startTextEditing,
    createTextInput,
    finishTextEditing,
    cancelTextEditing,
    cleanupTextInput
  }
}
