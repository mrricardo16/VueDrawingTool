export interface BaseElement {
  id: number
  name: string
  color: string
  angle?: number
  fields?: Record<string, unknown>
  mustFree?: unknown[]
  layerIds?: string[]
  layerId?: string
}

export interface Point extends BaseElement {
  x: number
  y: number
  type: string
}

export interface Line extends BaseElement {
  startPointId: number
  endPointId: number
  mode?: string
}

export interface BSpline extends BaseElement {
  startPointId?: number
  endPointId?: number
  siteA?: number
  siteB?: number
  controlPointIds?: number[]
  pointIds?: number[]
  controlPoints?: Point[]
  params?: Record<string, unknown>
  mode?: string
}

export interface TextElement extends BaseElement {
  x: number
  y: number
  fontSize?: number
}

export interface Area extends BaseElement {
  points: Array<Pick<Point, 'x' | 'y' | 'id'>>
}

export interface SelectionIds {
  points: number[]
  lines: number[]
  texts: number[]
  areas: number[]
}

export type HitType = 'point' | 'text' | 'line' | 'bspline' | 'area'

export interface HitResult<T = unknown> {
  type: HitType
  target: T
}
