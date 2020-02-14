/* @flow */

import { schemaComposer } from '../..';

describe('github issue #231: Cloning a resolver evaluates its configuration thunks', () => {
  it('clone a resolver without evaluating its type and args thunks', async () => {
    const aTypeThunk = jest.fn(() => 'String');

    const aResolver = schemaComposer.createResolver({
      name: aTypeThunk,
      type: 'Boolean',
      args: {
        anArg: aTypeThunk,
      },
    });

    aResolver.clone();

    expect(aTypeThunk).not.toBeCalled();
  });
});
