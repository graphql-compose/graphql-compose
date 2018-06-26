/* @flow strict */

import { SchemaComposer } from '..';

describe('Flowtype tests', () => {
  it('TContext validation tests', () => {
    type Context = {
      a: string,
      b: number,
    };

    type Context2 = {
      c2: string,
      d2: number,
    };

    const Schema: SchemaComposer<Context> = new SchemaComposer();
    const UserTC = Schema.TypeComposer.create('User');
    UserTC.addResolver({
      name: 'findOne',
      resolve: ({ context }) => {
        context.a;
        // $FlowFixMe property `c2` not found in Context
        context.c2;
      },
    });

    //
    //

    const Schema2: SchemaComposer<Context2> = new SchemaComposer();
    const UserTC2 = Schema2.TypeComposer.create('User');
    UserTC2.addResolver({
      name: 'findOne',
      resolve: ({ context }) => {
        // $FlowFixMe property `a` not found in Context2
        context.a;
        context.c2;
      },
    });
  });
});
