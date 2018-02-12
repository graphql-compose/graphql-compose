/* @flow strict */

import toDottedObject from '../toDottedObject';

describe('toDottedObject()', () => {
  it('should dot nested objects', () => {
    expect(toDottedObject({ a: { b: { c: 1 } } })).toEqual({ 'a.b.c': 1 });
  });
});
