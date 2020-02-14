/* @flow */

import { schemaComposer } from '../..';

describe('github issue #231: Cloning a resolver evaluates its configuration thunks', () => {
  it('clone a resolver without evaluating its type and args thunks', async () => {
    const anArgThunk = jest.fn(() => 'String');

    const aResolver = schemaComposer.createResolver({
      name: anArgThunk,
      type: 'Boolean',
      args: {
        anArg: anArgThunk,
      },
    });

    aResolver.clone();

    expect(anArgThunk).not.toBeCalled();
  });
});
