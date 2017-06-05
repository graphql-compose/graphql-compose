/* @flow */

import { expect } from 'chai';
import toDottedObject from '../toDottedObject';

describe('toDottedObject()', () => {
  it('should dot nested objects', () => {
    expect(toDottedObject({ a: { b: { c: 1 } } })).to.eql({ 'a.b.c': 1 });
  });
});
