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
});

module.exports = {
  describe,
  it,
  expect,
  assert,
};
