/**
 * Web Worker for processing large map data
 * Offloads heavy computations from main thread
 */

self.onmessage = function(e) {
  const { type, data } = e.data
  
  switch (type) {
    case 'PROCESS_MAP_DATA':
      processMapData(data)
      break
    case 'CALCULATE_BOUNDS':
      calculateBounds(data)
      break
    case 'FILTER_VISIBLE_ELEMENTS':
      filterVisibleElements(data)
      break
    default:
      console.warn('Unknown worker task:', type)
  }
}

function processMapData(mapData) {
  try {
    const startTime = performance.now()
    
    const result = {
      points: [],
      lines: [],
      bsplines: [],
      texts: [],
      areas: []
    }
    
    // Process sites
    if (mapData.Sites) {
      result.points = Object.values(mapData.Sites).map(site => ({
        id: site.id,
        x: site.x,
        y: site.y,
        type: getSiteType(site.fields),
        name: site.name || "NoName",
        color: site.color || "",
        angle: site.angle || 0.0,
        layername: site.layerName || "g",
        fields: site.fields || {},
        mustFree: site.mustFree || []
      }))
    }
    
    // Process tracks
    if (mapData.Tracks) {
      result.lines = Object.values(mapData.Tracks)
        .filter(track => track.trackType === 1)
        .map(track => ({
          id: track.id,
          startPointId: track.siteA,
          endPointId: track.siteB,
          mode: track.direction === 0 ? 'bidirectional' : 'single',
          name: track.name || "NoName",
          color: track.color || "",
          angle: track.angle || 0.0,
          layername: track.layerName || "g",
          fields: track.fields || {},
          mustFree: track.mustFree || []
        }))
    }
    
    // Process curves
    if (mapData.Curves) {
      result.bsplines = Object.values(mapData.Curves)
        .filter(curve => curve.trackType === 3)
        .map(curve => {
          const controlPoints = parseControlPoints(curve)
          return {
            id: curve.id,
            startPointId: curve.siteA,
            endPointId: curve.siteB,
            controlPoints: controlPoints,
            controlPointIds: controlPoints.map(cp => cp.id),
            params: {},
            mode: curve.direction === 0 ? 'bidirectional' : 'single',
            name: curve.name || "NoName",
            color: curve.color || "",
            angle: curve.angle || 0.0,
            layername: curve.layerName || "g",
            fields: curve.fields || {},
            mustFree: curve.mustFree || []
          }
        })
    }
    
    // Process texts
    if (mapData.Text) {
      result.texts = Object.values(mapData.Text).map(text => ({
        id: text.id,
        name: text.name || "",
        x: text.x,
        y: text.y,
        color: text.color || "#ffffff",
        fontSize: text.fontSize || 36,
        angle: text.angle || 0.0,
        layername: text.layername || "g",
        fields: text.fields || {},
        mustFree: text.mustFree || []
      }))
    }
    
    // Process areas
    if (mapData.Area) {
      result.areas = Object.values(mapData.Area).map(area => ({
        id: area.id,
        layerName: area.layerName || "g",
        name: area.name || "NoName",
        opacity: area.opacity || 50,
        color: area.color || "#FFFFFF",
        fields: area.fields || {},
        carNum: area.carNum || 0,
        points: area.points || []
      }))
    }
    
    const endTime = performance.now()
    
    self.postMessage({
      type: 'PROCESS_MAP_DATA_COMPLETE',
      result: result,
      processingTime: endTime - startTime,
      stats: {
        points: result.points.length,
        lines: result.lines.length,
        bsplines: result.bsplines.length,
        texts: result.texts.length,
        areas: result.areas.length
      }
    })
    
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message
    })
  }
}

function calculateBounds(elements) {
  if (!elements || elements.length === 0) {
    self.postMessage({
      type: 'CALCULATE_BOUNDS_COMPLETE',
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    })
    return
  }
  
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  elements.forEach(element => {
    if (element.x !== undefined && element.y !== undefined) {
      minX = Math.min(minX, element.x)
      minY = Math.min(minY, element.y)
      maxX = Math.max(maxX, element.x)
      maxY = Math.max(maxY, element.y)
    }
  })
  
  self.postMessage({
    type: 'CALCULATE_BOUNDS_COMPLETE',
    bounds: { minX, minY, maxX, maxY }
  })
}

function filterVisibleElements(elements, viewport, scale, offset) {
  const { x, y, width, height } = viewport
  const padding = 100
  
  const visible = elements.filter(element => {
    const elementX = element.x * scale + offset.x
    const elementY = -element.y * scale + offset.y
    
    return elementX >= x - padding && 
           elementX <= x + width + padding &&
           elementY >= y - padding && 
           elementY <= y + height + padding
  })
  
  self.postMessage({
    type: 'FILTER_VISIBLE_ELEMENTS_COMPLETE',
    visibleElements: visible
  })
}

function getSiteType(fields) {
  if (!fields) return 'point'
  if (fields.shelf === 'true') return 'site'
  if (fields.charging === 'true') return 'charging'
  if (fields.rest === 'true') return 'rest'
  return 'point'
}

function parseControlPoints(curve) {
  if (!curve.ControlPoints) return []
  
  if (typeof curve.ControlPoints === 'string') {
    try {
      const parsed = JSON.parse(curve.ControlPoints)
      return parsed.map((cp, index) => ({
        id: `cp_${curve.id}_${index}`,
        x: cp.x,
        y: cp.y
      }))
    } catch (e) {
      return []
    }
  } else if (Array.isArray(curve.ControlPoints)) {
    return curve.ControlPoints.map((cp, index) => ({
      id: `cp_${curve.id}_${index}`,
      x: cp.x,
      y: cp.y
    }))
  }
  return []
}
