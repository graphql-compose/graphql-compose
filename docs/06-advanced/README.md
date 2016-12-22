# Advanced

### How `Resolver.wrapResolve` work internally
- `capturing phase`, when you may change `resolveParams` before it will pass to next `resolve`
- `bubbling phase`, when you may change response from underlying `resolve`

```js
Resolver.wrapResolve(next => rp => {
  // [CAPTURING PHASE]:
  // `rp` consist from { source, args, context, info, projection }
  // you may change `source`, `args`, `context`, `info`, `projection` before it will pass to `next` underlying resolve function.

  // ...some code which modify `rp` (resolveParams)

  // ... or just stop propagation
  //   throw new Error();
  //   or
  //   return Promise.resolve(null);

  // pass request to underlying middleware and get result promise from it
  const resultPromise = next(rp);

  // [BUBBLING PHASE]: here you may change payload of underlying resolve method, via promise syntax
  // ...some code, which may add `then()` or `catch()` to result promise
  //    resultPromise.then(payload => { console.log(payload); return payload; })

  return resultPromise; // return payload promise to upper wrapper
});
```

Several sequential `wrapResolve`
```js
Resolver.wrapResolve(M1).wrapResolve(M2);
```
working work such way:
- call capture phase of `M2` (changing rp)
- call capture phase of `M1` (changing rp)
- call initial `resolve` method e
- call bubbling phase of `M1` (changing result)
- call bubbling phase of `M2` (changing result)
- pass result to `graphql` runner.
