const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toEqual: (expected) => assert.deepStrictEqual(actual, expected),
  toContain: (expected) => {
    assert.ok(
      typeof actual === 'string' || Array.isArray(actual)
        ? actual.includes(expected)
        : false,
      `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`
    );
  },
  toBeDefined: () => assert.notStrictEqual(actual, undefined),
  toBeGreaterThanOrEqual: (expected) => assert.ok(actual >= expected, `Expected ${actual} >= ${expected}`),
  toBeGreaterThan: (expected) => assert.ok(actual > expected, `Expected ${actual} > ${expected}`),
  toBeLessThan: (expected) => assert.ok(actual < expected, `Expected ${actual} < ${expected}`),
  toBeNull: () => assert.strictEqual(actual, null),
  toBeTruthy: () => assert.ok(Boolean(actual)),
  toBeFalsy: () => assert.ok(!Boolean(actual)),
});

module.exports = {
  describe,
  it,
  expect,
  assert,
};
