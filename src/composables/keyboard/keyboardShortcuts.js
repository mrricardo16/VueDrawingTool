/**
 * 键盘快捷键处理器工厂
 */
export function createKeyboardShortcutHandlers({
  onUndo,
  onDelete,
  onClearMode,
  onShiftPressed,
  onShiftReleased,
  onShiftStateChange
}) {
  const handleKeyDown = (event) => {
    if (event.key === 'Shift') {
      onShiftStateChange?.(true)
      onShiftPressed?.()
    }

    if (event.ctrlKey && event.key === 'z') {
      event.preventDefault()
      if (!event.repeat) onUndo?.()
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      onDelete?.()
    }

    if (event.key === 'Escape') {
      onClearMode?.()
    }
  }

  const handleKeyUp = (event) => {
    if (event.key === 'Shift') {
      onShiftStateChange?.(false)
      onShiftReleased?.()
    }
  }

  return { handleKeyDown, handleKeyUp }
}

export function bindKeyboardEvents(handleKeyDown, handleKeyUp) {
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
}

export function unbindKeyboardEvents(handleKeyDown, handleKeyUp) {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
}
