// Lightweight ID generator for Draw elements
// Ensures returned IDs fit in signed 32-bit integer range.
const MAX_INT32 = 2147483647
let _counter = 1
const _mapping = new Map()

/**
 * Initialize the counter based on existing max ID.
 * @param {number} [maxExistingId]
 */
export function initIdCounter(maxExistingId = 0) {
  const n = Number(maxExistingId) || 0
  _counter = Math.max(1, n + 1)
  if (_counter > MAX_INT32) {
    console.warn('idGenerator: maxExistingId exceeds INT32, resetting counter to 1')
    _counter = 1
  }
}

/**
 * Return next numeric ID (safe signed 32-bit integer)
 * @returns {number}
 */
export function nextId() {
  if (_counter >= MAX_INT32) {
    throw new Error('idGenerator: reached INT32 limit')
  }
  return _counter++
}

/**
 * Reserve a mapping for legacy string ID -> new numeric ID
 * @param {string} legacyId
 * @returns {number}
 */
export function reserveLegacyId(legacyId) {
  if (_mapping.has(legacyId)) return _mapping.get(legacyId)
  const id = nextId()
  _mapping.set(legacyId, id)
  return id
}

export function getMapping() { return _mapping }

export function reset() { _counter = 1; _mapping.clear() }
