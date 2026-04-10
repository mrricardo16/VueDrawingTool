import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useViewControl } from '../useViewControl.js'
import { useAlignment } from '../useAlignment.js'
import { useMapStore } from '../../stores/mapStore.js'
import { useToastMessage } from './useToastMessage.js'
import { useUploadActions } from './useUploadActions.js'
import { useAppBootstrap } from './useAppBootstrap.js'
import { useEditorActions } from './useEditorActions.js'

/**
 * App 门面层：聚合状态、行为与子 composable
 * 让 App.vue 保持容器职责。
 *
 * 对外返回：
 * - 全局编辑状态（工具、要素、选中、加载、历史）
 * - UI 反馈状态（右键菜单、toast）
 * - MapEditorShell/AppFeedbackLayer 事件映射
 * - 画布、上传、对齐、撤销等行为函数
 *
 * @returns {Record<string, any>}
 */
export function useAppFacade() {
  const mapStore = useMapStore()
  const {
    currentTool,
    selectionMode,
    lineReverseEnabled,
    points,
    lines,
    bsplines,
    texts,
    areas,
    selectedPoints,
    selectedLines,
    selectedTexts,
    selectedAreas,
    pointById,
    lineById,
    textById,
    bsplineById,
    history,
    canUndo,
    contextMenuVisible,
    contextMenuPosition,
    contextMenuSelectedPoint,
    isLoading,
    loadingProgress,
    loadingStatus,
    loadedCount,
    estimatedTime
  } = storeToRefs(mapStore)

  const bsplineParams = ref({ tension: 0.5, segments: 20 })
  const fileInput = ref(null)
  const drawingCanvas = ref(null)

  const {
    toastVisible,
    toastType,
    toastTitle,
    toastMessage,
    toastDuration,
    toastPosition,
    showToast,
    hideToast,
    handleShowToast
  } = useToastMessage()

  const {
    handleUploadMap,
    handleUploadToServer
  } = useUploadActions(mapStore, fileInput, showToast)

  const hasSelection = computed(() =>
    selectedPoints.value.length > 0 || selectedLines.value.length > 0 ||
    selectedTexts.value.length > 0 || selectedAreas.value.length > 0
  )

  const {
    handleFitView, handleResetView, focusOnElement
  } = useViewControl(drawingCanvas, pointById, lineById, textById, bsplineById, areas)

  const { isAligning, performAlignment: alignElements, canAlign, getAlignmentStats } =
    useAlignment(points, texts)

  const {
    handleCanvasReady,
    handleDragStart,
    handleMoveCompleted,
    handleUpdateArea,
    handleBsplineAnchorDragEnd,
    handleAreaAnchorDragEnd,
    performAlignment,
    onElementSelection,
    onElementFocus,
    handleToolChange,
    handleClearMode,
    handleSelectionModeChange,
    handleLineReverseToggleChange,
    handleShiftPressed,
    handleShiftReleased
  } = useEditorActions({
    mapStore,
    currentTool,
    selectedPoints,
    selectedTexts,
    drawingCanvas,
    alignElements,
    focusOnElement
  })

  useAppBootstrap(mapStore)

  const mapEditorShellListeners = {
    'canvas-ready': handleCanvasReady,
    'tool-change': handleToolChange,
    'selection-mode-change': handleSelectionModeChange,
    'reverse-toggle-change': handleLineReverseToggleChange,
    'perform-alignment': performAlignment,
    'upload-map': handleUploadMap,
    'upload-to-server': handleUploadToServer,
    'save-local': mapStore.handleSaveLocal,
    'fit-view': handleFitView,
    'reset-view': handleResetView,
    'delete-selected': mapStore.handleDeleteSelected,
    undo: mapStore.undo,
    'clear-mode': handleClearMode,
    'shift-pressed': handleShiftPressed,
    'shift-released': handleShiftReleased,
    'point-added': mapStore.handlePointAdded,
    'point-selected': mapStore.setSelectedPoints,
    'line-selected': mapStore.setSelectedLines,
    'selection-changed': ({ points = [], lines = [], texts = [], areas = [] } = {}) => {
      mapStore.setSelectedPoints(points)
      mapStore.setSelectedLines(lines)
      mapStore.setSelectedTexts(texts)
      mapStore.setSelectedAreas(areas)
    },
    'line-created': mapStore.handleLineCreated,
    'bspline-created': mapStore.handleBsplineCreated,
    'bspline-anchor-drag-end': handleBsplineAnchorDragEnd,
    'text-added': mapStore.handleTextAdded,
    'text-selected': mapStore.setSelectedTexts,
    'area-created': mapStore.handleAreaCreated,
    'area-anchor-drag-end': handleAreaAnchorDragEnd,
    'area-selected': mapStore.setSelectedAreas,
    'show-context-menu': mapStore.handleShowContextMenu,
    'drag-start': handleDragStart,
    'move-completed': handleMoveCompleted,
    'show-toast': handleShowToast,
    'update-point': mapStore.handleUpdatePoint,
    'update-line': mapStore.handleUpdateLine,
    'update-text': mapStore.handleUpdateText,
    'update-curve': mapStore.handleUpdateCurve,
    'update-area': handleUpdateArea,
    'element-selection': onElementSelection,
    'element-focus': onElementFocus
  }

  const appFeedbackListeners = {
    'change-point-type': mapStore.handleChangePointType,
    'context-menu-action': mapStore.handleContextMenuAction,
    'close-context-menu': mapStore.handleCloseContextMenu,
    'cancel-loading': mapStore.handleCancelLoading,
    'close-toast': hideToast
  }

  return {
    mapStore,

    currentTool,
    selectionMode,
    lineReverseEnabled,
    points,
    lines,
    bsplines,
    texts,
    areas,
    selectedPoints,
    selectedLines,
    selectedTexts,
    selectedAreas,
    bsplineParams,
    history,
    mapEditorShellListeners,
    appFeedbackListeners,
    fileInput,
    drawingCanvas,
    hasSelection,

    isLoading,
    loadingProgress,
    loadingStatus,
    loadedCount,
    estimatedTime,
    handleUploadMap,
    handleFileSelected: mapStore.handleFileSelected,
    handleSaveLocal: mapStore.handleSaveLocal,
    handleCancelLoading: mapStore.handleCancelLoading,
    handleUploadToServer,

    contextMenuVisible,
    contextMenuPosition,
    contextMenuSelectedPoint,

    isAligning,
    canAlign,
    getAlignmentStats,

    handleToolChange,
    handleSelectionModeChange,
    handleLineReverseToggleChange,
    handleClearMode,
    handleShiftPressed,
    handleShiftReleased,

    handlePointAdded: mapStore.handlePointAdded,
    handleLineCreated: mapStore.handleLineCreated,
    handleBsplineCreated: mapStore.handleBsplineCreated,
    handleTextAdded: mapStore.handleTextAdded,
    handleAreaCreated: mapStore.handleAreaCreated,
    handleUpdatePoint: mapStore.handleUpdatePoint,
    handleUpdateLine: mapStore.handleUpdateLine,
    handleUpdateText: mapStore.handleUpdateText,
    handleUpdateCurve: mapStore.handleUpdateCurve,
    handleDeleteSelected: mapStore.handleDeleteSelected,

    canUndo,
    undo: mapStore.undo,
    handleDragStart,
    handleMoveCompleted,
    handleUpdateArea,
    handleBsplineAnchorDragEnd,
    handleAreaAnchorDragEnd,

    handleFitView,
    handleResetView,
    focusOnElement,
    onElementSelection,

    handleShowContextMenu: mapStore.handleShowContextMenu,
    handleCloseContextMenu: mapStore.handleCloseContextMenu,
    handleChangePointType: mapStore.handleChangePointType,

    performAlignment,

    toastVisible,
    toastType,
    toastTitle,
    toastMessage,
    toastDuration,
    toastPosition,
    showToast,
    hideToast,
    handleShowToast,
    handleCanvasReady
  }
}
