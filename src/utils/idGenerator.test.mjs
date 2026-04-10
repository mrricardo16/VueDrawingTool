import assert from 'assert'
import { reset, initIdCounter, nextId, reserveLegacyId, getMapping } from './idGenerator.js'

// Simple unit tests
reset()
initIdCounter(0)
const a = nextId()
const b = nextId()
assert.strictEqual(b, a + 1, 'nextId should increment')

// Reserve legacy id mapping
const legacy = '1620000000000'
const mapped = reserveLegacyId(legacy)
assert.ok(Number.isInteger(mapped), 'mapped id should be integer')
assert.strictEqual(getMapping().get(legacy), mapped, 'mapping should contain legacy')

// init with existing max
reset()
initIdCounter(1000)
const c = nextId()
assert.strictEqual(c, 1001, 'initIdCounter should set start from max+1')

console.log('idGenerator tests passed')
