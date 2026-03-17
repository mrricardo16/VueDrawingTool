export function screenToWorld(x, y, scale, offset) {
  return {
    x: (x - offset.x) / scale,
    y: -(y - offset.y) / scale
  }
}

export function worldToScreen(x, y, scale, offset) {
  return {
    x: x * scale + offset.x,
    y: -y * scale + offset.y
  }
}

export function createAreaPayload(areaPoints) {
  return {
    id: Date.now(),
    layerName: 'g',
    name: 'NoName',
    opacity: 50,
    color: '#FFFFFF',
    fields: {},
    carNum: 0,
    points: areaPoints.map((point) => ({
      x: point.x,
      y: point.y,
      site: -1
    }))
  }
}
