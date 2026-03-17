import { computed, ref } from 'vue'

/**
 * @typedef {{title?:string,items?:Array<any>}|null} DropdownConfig
 */

/**
 * @param {{value:DropdownConfig}} dropdownConfigRef
 * @param {()=>HTMLElement|null} [getRootElement]
 */
export function useToolButtonDropdown(dropdownConfigRef, getRootElement) {
  const showDropdown = ref(false)

  const hasDropdown = computed(() => !!dropdownConfigRef.value)
  const dropdownTitle = computed(() => dropdownConfigRef.value?.title || '选项')
  const dropdownItems = computed(() => dropdownConfigRef.value?.items || [])

  /** 切换按钮下拉状态 */
  const toggleDropdown = () => {
    showDropdown.value = !showDropdown.value
  }

  /** 关闭下拉 */
  const closeDropdown = () => {
    showDropdown.value = false
  }

  /** @param {MouseEvent} event */
  const handleClickOutside = (event) => {
    const rootEl = getRootElement?.()
    if (!rootEl?.contains(event.target)) {
      showDropdown.value = false
    }
  }

  return {
    showDropdown,
    hasDropdown,
    dropdownTitle,
    dropdownItems,
    toggleDropdown,
    closeDropdown,
    handleClickOutside
  }
}
