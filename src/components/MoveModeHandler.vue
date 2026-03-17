<template>
  <div class="move-mode-handler">
    <!-- 这个组件只处理移动模式逻辑，不渲染任何内容 -->
  </div>
</template>

<script>
import { CoordinateUtils } from '../utils/coordinateUtils.js'
import { EventUtils } from '../utils/eventUtils.js'
import {
  buildDraggedElements,
  applyDragDelta,
  findPointAtWorld
} from '../composables/move/moveDragUtils.js'

export default {
  name: 'MoveModeHandler',
  props: {
    canvas: {
      type: HTMLCanvasElement,
      default: null
    },
    currentTool: {
      type: String,
      default: null
    },
    points: {
      type: Array,
      default: () => []
    },
    lines: {
      type: Array,
      default: () => []
    },
    bsplines: {
      type: Array,
      default: () => []
    },
    texts: {
      type: Array,
      default: () => []
    },
    selectedPoints: {
      type: Array,
      default: () => []
    },
    selectedLines: {
      type: Array,
      default: () => []
    },
    selectedTexts: {
      type: Array,
      default: () => []
    },
    areas: {
      type: Array,
      default: () => []
    },
    selectedAreas: {
      type: Array,
      default: () => []
    },
    scale: {
      type: Number,
      default: 1
    },
    offset: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    }
  },
  emits: ['elements-updated', 'drag-start', 'drag-end', 'drag-update', 'move-completed'],
  data() {
    return {
      // 移动模式相关状态
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      mousePosition: { x: 0, y: 0 },
      // 拖拽的元素集合
      draggedElements: {
        points: [],
        lines: [],
        texts: [],
        bsplineControlPoints: [], // B样条内嵌控制点，移动时须同步平移
        areas: []    // 整体平移的区域（修改其内嵌 points 坐标）
      },
      // 上次鼠标位置
      lastMousePosition: { x: 0, y: 0 },
      // hasMoved: 本次按下后是否真正发生了位移。
      // 用于区分"点击（无位移）"和"拖拽（有位移）"：
      //   - 点击：mousedown → isDragging=true → 立即 mouseup → delta=0 → hasMoved=false
      //           → NOT emit move-completed → 无幻影历史条目
      //   - 拖拽：mousedown → isDragging=true → mousemove → delta>0 → hasMoved=true
      //           → mouseup → emit move-completed
      hasMoved: false,
      // 节流控制
      lastUpdateTime: 0,
      updateThrottle: 16, // 约60fps
      animationFrameId: null
    }
  },
  watch: {
    canvas: {
      handler(newCanvas) {
        if (newCanvas) {
          this.setupMouseEvents()
        }
      },
      immediate: true
    },
    currentTool(newTool, oldTool) {
      // 当切换出移动模式时，清理状态
      if (oldTool === 'move' && newTool !== 'move') {
        this.cleanup()
      }
    }
  },
  beforeUnmount() {
    this.cleanupMouseEvents()
  },
  mounted() {
    this.setupMouseEvents()
  },
  methods: {
    setupMouseEvents() {
      this.cleanupMouseEvents()
      
      if (this.canvas) {
        this.canvas.addEventListener('mousedown', this.handleMouseDown)
        this.canvas.addEventListener('mousemove', this.handleMouseMove)
        
        // 将 mouseup 事件监听器添加到 document，以便在画布外也能捕获
        document.addEventListener('mouseup', this.handleMouseUp)
      }
    },
    
    cleanupMouseEvents() {
      if (this.canvas) {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown)
        this.canvas.removeEventListener('mousemove', this.handleMouseMove)
      }
      
      // 清理 document 上的 mouseup 事件监听器
      document.removeEventListener('mouseup', this.handleMouseUp)
    },
    
    handleMouseDown(event) {
      // 只在移动模式下处理
      if (this.currentTool !== 'move' || event.button !== 0) {
        return
      }
      
      const rect = this.canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      this.handleMoveTool(x, y)
    },
    
    handleMouseMove(event) {
      if (!this.canvas) return
      
      const rect = this.canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      this.mousePosition = { x, y }
      
      // 移动模式：拖拽元素
      if (this.currentTool === 'move' && this.isDragging) {
        // 使用 requestAnimationFrame 确保平滑更新
        if (!this.animationFrameId) {
          this.animationFrameId = requestAnimationFrame(() => {
            this.updateElementsPosition(x, y)
            this.animationFrameId = null
          })
        }
      }
    },
    
    handleMouseUp(event) {
      // 移动模式：结束拖拽
      if (this.currentTool === 'move' && this.isDragging) {
        // 发出最终更新事件
        const updatedElements = {
          points: this.draggedElements.points,
          texts: this.draggedElements.texts
        }
        
        this.$emit('elements-updated', updatedElements)
        this.$emit('drag-end')
        // 只在发生过真实位移时才触发历史快照。
        // 若用户只是在 move 模式下点击而未拖动（hasMoved=false），
        // isDragging 已被设为 true，但 delta 从未 > 阈值，因此不保存快照。
        // 这防止了"点击→松手→产生与当前状态完全相同的幻影历史条目"的问题。
        if (this.hasMoved) {
          this.$emit('move-completed')
        }
        
        this.isDragging = false
        this.hasMoved = false
        this.draggedElements = { points: [], lines: [], texts: [], bsplineControlPoints: [], areas: [] }
        this.dragOffset = { x: 0, y: 0 }
        this.lastMousePosition = { x: 0, y: 0 }
        
        // 清理动画帧
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId)
          this.animationFrameId = null
        }
        
        return
      }
    },
    
    // 移动模式处理方法
    handleMoveTool(x, y) {
      // 将屏幕坐标转换为世界坐标
      const worldCoords = CoordinateUtils.screenToWorld(x, y, this.scale, this.offset)
      
      // 优先处理选中的元素（框选的元素）
      const hasSelection = this.selectedPoints.length > 0 ||
                          this.selectedLines.length > 0 ||
                          this.selectedTexts.length > 0 ||
                          this.selectedAreas.length > 0
      
      if (hasSelection) {
        // 移动选中的元素
        this.startDragSelection(worldCoords.x, worldCoords.y)
      } else {
        // 如果没有选中元素，尝试点击单个点
        const clickedPoint = this.findPointAt(worldCoords.x, worldCoords.y)
        if (clickedPoint) {
          this.startDragSinglePoint(clickedPoint, worldCoords.x, worldCoords.y)
        }
      }
    },
    
    // 开始拖拽选中的元素
    startDragSelection(worldX, worldY) {
      this.draggedElements = buildDraggedElements({
        points: this.points,
        lines: this.lines,
        texts: this.texts,
        bsplines: this.bsplines,
        areas: this.areas,
        selectedPoints: this.selectedPoints,
        selectedLines: this.selectedLines,
        selectedTexts: this.selectedTexts,
        selectedAreas: this.selectedAreas
      })

      // 记录开始拖拽时的鼠标位置（世界坐标）
      this.dragOffset = { x: worldX, y: worldY }
      this.lastMousePosition = { x: worldX, y: worldY }

      this.isDragging = true
      // 通知父组件开始拖拽（含 areaIds 供 mapStore 快照历史）
      this.$emit('drag-start', {
        pointIds: this.draggedElements.points.map(p => p.id),
        textIds:  this.draggedElements.texts.map(t => t.id),
        areaIds:  this.draggedElements.areas.map(a => a.id),
      })
    },
    
    // 开始拖拽单个点
    startDragSinglePoint(point, worldX, worldY) {
      this.draggedElements.points = [point]
      
      // 记录开始拖拽时的鼠标位置（世界坐标）
      this.dragOffset = { x: worldX, y: worldY }
      this.lastMousePosition = { x: worldX, y: worldY }
      
      this.isDragging = true
      // 通知父组件开始拖拽
      this.$emit('drag-start', {
        pointIds: this.draggedElements.points.map(p => p.id),
        textIds: []
      })
    },
    
    // 更新元素位置
    updateElementsPosition(x, y) {
      if (!this.isDragging) return
      
      const currentTime = performance.now()
      
      // 节流控制，避免过于频繁的更新
      if (currentTime - this.lastUpdateTime < this.updateThrottle) {
        return
      }
      
      this.lastUpdateTime = currentTime
      
      // 将屏幕坐标转换为世界坐标
      const worldCoords = CoordinateUtils.screenToWorld(x, y, this.scale, this.offset)
      
      // 计算相对于上次鼠标位置的移动距离
      const deltaX = worldCoords.x - this.lastMousePosition.x
      const deltaY = worldCoords.y - this.lastMousePosition.y
      
      // 只有当位移超过 0.5 世界单位时才认为真正发生了移动。
      // 这过滤掉因浮点噪声或极小抖动造成的亚像素更新，
      // 防止它们被认为是"真实拖拽"。
      if (!this.hasMoved && (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5)) {
        this.hasMoved = true
      }
      
      applyDragDelta(this.draggedElements, deltaX, deltaY)
      
      // 更新上次鼠标位置
      this.lastMousePosition = { x: worldCoords.x, y: worldCoords.y }
      
      // 在拖拽过程中发出重绘事件，不发出元素更新事件
      this.$emit('drag-update')
    },
    
    findPointAt(x, y) {
      return findPointAtWorld(this.points, x, y, this.scale)
    },
    
    cleanup() {
      // 清理移动模式状态
      this.isDragging = false
      this.hasMoved = false
      this.draggedElements = { points: [], lines: [], texts: [], bsplineControlPoints: [], areas: [] }
      this.dragOffset = { x: 0, y: 0 }
      this.lastMousePosition = { x: 0, y: 0 }
      
      // 清理动画帧
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId)
        this.animationFrameId = null
      }
    }
  }
}
</script>

<style scoped>
.move-mode-handler {
  display: none;
}
</style>
