import { parse, subscribe } from 'graphql';
import { SchemaComposer } from '../..';

describe('github issue #405: Subscription field resolver must be a function if provided', () => {
  it('should add graphql-tools subscription resolvers with subscribe', async () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      type Query {
        dummy: String
      }

      type Subscription {
        greet(name: String = "Max"): String!
      }
    `);

    const subscribeFn = async function* (_root: unknown, args: { name: string }) {
      yield `Hello ${args.name}!`;
    };
    const resolveFn = (payload: string) => payload;

    sc.addResolveMethods({
      Subscription: {
        greet: {
          subscribe: subscribeFn,
          resolve: resolveFn,
        },
      },
    });

    expect(sc.Subscription.getField('greet').subscribe).toBe(subscribeFn);
    expect(sc.Subscription.getField('greet').resolve).toBe(resolveFn);

    const schema = sc.buildSchema();
    const result = await subscribe({
      schema,
      document: parse('subscription { greet }'),
    });

    expect(result).toBeDefined();
    expect(typeof (result as any)[Symbol.asyncIterator]).toBe('function');

    const payloads: any[] = [];
    for await (const payload of result as AsyncIterable<any>) {
      payloads.push(payload);
    }

    expect(payloads).toEqual([{ data: { greet: 'Hello Max!' } }]);

    const outResolveMap = sc.getResolveMethods() as any;
    expect(outResolveMap.Subscription.greet.subscribe).toBe(subscribeFn);
    expect(outResolveMap.Subscription.greet.resolve).toBe(resolveFn);
  });
});
