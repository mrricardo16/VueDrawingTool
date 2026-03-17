<template>
  <div class="area-handler">
    <!-- 这个组件只处理区域绘制逻辑，不渲染任何内容 -->
  </div>
</template>

<script>
import {
  screenToWorld,
  worldToScreen,
  createAreaPayload
} from '../composables/area/areaDrawingUtils.js'

export default {
  name: 'AreaHandler',
  props: {
    canvas: {
      type: HTMLCanvasElement,
      default: null
    },
    currentTool: {
      type: String,
      default: null
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
  emits: ['area-created', 'redraw-canvas'],
  data() {
    return {
      isDrawingArea: false,
      areaPoints: [],
      tempAreaPoints: [],
      listenersSetup: false
    }
  },
  watch: {
    currentTool(newTool, oldTool) {
      if (newTool === 'area') {
        this.startAreaMode()
        this.setupEventListeners()
      } else if (oldTool === 'area') {
        this.endAreaMode()
        this.removeEventListeners()
      }
    },
    canvas(newCanvas, oldCanvas) {
      if (oldCanvas) {
        this.removeEventListeners()
      }
      if (newCanvas) {
        this.setupEventListeners()
      }
    }
  },
  mounted() {
    // 延迟设置事件监听器，确保canvas已经准备好
    this.$nextTick(() => {
      this.setupEventListeners()
    })
  },
  beforeUnmount() {
    this.removeEventListeners()
  },
  methods: {
    setupEventListeners() {
      if (this.canvas && this.currentTool === 'area' && !this.listenersSetup) {
        this.canvas.addEventListener('mousedown', this.handleCanvasClick)
        this.canvas.addEventListener('mousemove', this.handleMouseMove)
        this.listenersSetup = true
      }
    },
    
    removeEventListeners() {
      if (this.canvas && this.listenersSetup) {
        this.canvas.removeEventListener('mousedown', this.handleCanvasClick)
        this.canvas.removeEventListener('mousemove', this.handleMouseMove)
        this.listenersSetup = false
      }
    },
    
    startAreaMode() {
      if (import.meta.env.DEV) console.log('AreaHandler: startAreaMode called')
      this.isDrawingArea = true
      this.areaPoints = []
      this.tempAreaPoints = []
      this.updateCursor()
    },
    
    endAreaMode() {
      this.isDrawingArea = false
      this.areaPoints = []
      this.tempAreaPoints = []
      this.restoreCursor()
    },
    
    updateCursor() {
      if (this.canvas && this.isDrawingArea) {
        this.canvas.style.cursor = 'crosshair'
      }
    },
    
    restoreCursor() {
      if (this.canvas) {
        this.canvas.style.cursor = 'default'
      }
    },
    
    handleCanvasClick(event) {
      if (!this.isDrawingArea || this.currentTool !== 'area') return
      
      const rect = this.canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      const world = screenToWorld(x, y, this.scale, this.offset)
      
      this.areaPoints.push({ x: world.x, y: world.y })
      
      // 绘制点击的点
      this.drawPoint(world.x, world.y)
      
      // 如果已经点击了4个点，创建区域
      if (this.areaPoints.length === 4) {
        this.createArea()
      }
    },
    
    handleMouseMove(event) {
      if (!this.isDrawingArea || this.currentTool !== 'area') return
      
      const rect = this.canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      const world = screenToWorld(x, y, this.scale, this.offset)
      
      // 临时存储鼠标位置用于预览
      this.tempAreaPoints = [...this.areaPoints, { x: world.x, y: world.y }]
      
      // 重绘画布以显示预览
      this.redrawCanvas()
    },
    
    drawPoint(x, y) {
      if (!this.canvas) return
      
      const ctx = this.canvas.getContext('2d')
      const screen = worldToScreen(x, y, this.scale, this.offset)
      
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    },
    
    drawAreaPreview() {
      if (!this.canvas || this.tempAreaPoints.length < 2) return
      
      const ctx = this.canvas.getContext('2d')
      
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      
      ctx.beginPath()
      
      // 绘制已有的点和临时点
      this.tempAreaPoints.forEach((point, index) => {
        const screen = worldToScreen(point.x, point.y, this.scale, this.offset)
        
        if (index === 0) {
          ctx.moveTo(screen.x, screen.y)
        } else {
          ctx.lineTo(screen.x, screen.y)
        }
      })
      
      // 如果有4个点，闭合路径
      if (this.tempAreaPoints.length === 4) {
        const firstPoint = this.tempAreaPoints[0]
        const firstScreen = worldToScreen(firstPoint.x, firstPoint.y, this.scale, this.offset)
        ctx.lineTo(firstScreen.x, firstScreen.y)
        ctx.fill()
      }
      
      ctx.stroke()
      ctx.restore()
    },
    
    redrawCanvas() {
      // 直接触发父组件重绘，然后立即绘制预览
      this.$emit('redraw-canvas')
      // 在下一个事件循环中绘制预览
      this.$nextTick(() => {
        this.drawAreaPreview()
      })
    },
    
    createArea() {
      if (this.areaPoints.length !== 4) return
      const area = createAreaPayload(this.areaPoints)
      
      if (import.meta.env.DEV) console.log('AreaHandler: Creating area', area)
      this.$emit('area-created', area)
      
      // 重置状态准备绘制下一个区域
      this.areaPoints = []
      this.tempAreaPoints = []
    },
    
    clearArea() {
      this.areaPoints = []
      this.tempAreaPoints = []
    }
  }
}
</script>
