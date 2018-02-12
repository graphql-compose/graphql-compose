/* @flow strict */

import filterByDotPaths, {
  isPresentInDotFilter,
  hideComplexValue,
  hideField,
  partialCloneSubpath,
} from '../filterByDotPaths';

describe('filterByDotPaths', () => {
  describe('filterByDotPaths()', () => {
    const data = {
      source: {
        name: 'nodkz',
        age: 30,
        location: {
          country: 'KZ',
          city: 'Almaty',
        },
      },
      args: {
        data: [{ id: 1 }, { id: 2 }],
      },
    };

    it('returns only requested field by string dot path', () => {
      expect(filterByDotPaths(data, 'source.age')).toEqual({
        'source.age': 30,
      });

      expect(filterByDotPaths(data, 'args.data.1.id')).toEqual({
        'args.data.1.id': 2,
      });
    });

    it('returns only requested fields by array of dot paths', () => {
      expect(filterByDotPaths(data, ['source.age', 'args.data.1.id', 'source.name'])).toEqual({
        'source.age': 30,
        'args.data.1.id': 2,
        'source.name': 'nodkz',
      });
    });

    it('returns only requested fields by comma/space separated dot paths', () => {
      expect(filterByDotPaths(data, 'source.age, args.data.1.id source.name  ')).toEqual({
        'source.age': 30,
        'args.data.1.id': 2,
        'source.name': 'nodkz',
      });
    });

    it('returns undefined value for non-existed path', () => {
      expect(filterByDotPaths(data, 'unexisted.path')).toEqual({
        'unexisted.path': undefined,
      });
    });

    it('should pass object unchanged if filter is empty', () => {
      expect(filterByDotPaths(data, null)).toEqual(data);
    });

    it('returns fields and hide which in opts.hideFields', () => {
      const filteredData = filterByDotPaths(data, null, {
        hideFields: {
          'source.*': 'request this fields explicitly',
          args: 'was hidden',
        },
      });
      expect(filteredData).not.toEqual(data); // check immutability of source Object
      expect(filteredData).toEqual({
        args: 'Object {} was hidden',
        source: {
          age: 30,
          location: 'Object {} request this fields explicitly',
          name: 'nodkz',
        },
      });
    });
  });

  describe('isPresentInDotFilter()', () => {
    it('should find in string', () => {
      expect(isPresentInDotFilter('name', 'name')).toBeTruthy();
      expect(isPresentInDotFilter('name', 'name.something')).toBeTruthy();

      expect(isPresentInDotFilter('name', 'names')).toBeFalsy();
      expect(isPresentInDotFilter('name', 'names.name')).toBeFalsy();
    });

    it('should find in array', () => {
      expect(isPresentInDotFilter('name', ['a', 'name'])).toBeTruthy();
      expect(isPresentInDotFilter('name', ['name.something', 'a'])).toBeTruthy();

      expect(isPresentInDotFilter('name', ['names', 'a'])).toBeFalsy();
      expect(isPresentInDotFilter('name', ['a', 'names.name'])).toBeFalsy();
    });
  });

  describe('hideComplexValue()', () => {
    it('should return simple types as is (untouched)', () => {
      expect(hideComplexValue(123)).toBe(123);
      expect(hideComplexValue('abc')).toBe('abc');
      expect(hideComplexValue(null)).toBe(null);
      expect(hideComplexValue(undefined)).toBe(undefined);
      expect(hideComplexValue(false)).toBe(false);
    });

    it('should hide long strings', () => {
      expect(hideComplexValue('a'.repeat(500))).toBe('String(length:500) was hidden');
    });

    it('should hide arrays', () => {
      expect(hideComplexValue([1, 2, 3])).toBe('Array(length:3) was hidden');
    });

    it('should hide object types', () => {
      const obj = { a: 1 };
      expect(hideComplexValue(obj)).toBe('Object {} was hidden');

      function Foo() {}
      expect(hideComplexValue(new Foo())).toBe('Object(Foo) was hidden');

      const p = Promise.resolve();
      expect(hideComplexValue(p)).toBe('Object(Promise) was hidden');
    });
  });

  describe('partialCloneSubpath()', () => {
    it('should partial clone sub objects', () => {
      const obj = {
        a: {},
        b: {},
      };
      const obj2 = { ...obj };
      partialCloneSubpath(obj2, ['a']);
      expect(obj2.a).not.toBe(obj.a);
      expect(obj2.b).toBe(obj.b);
    });

    it('should partial clone sub arrays', () => {
      const obj = {
        a: [],
        b: [],
      };
      const obj2 = { ...obj };
      partialCloneSubpath(obj2, ['a']);
      expect(obj2.a).not.toBe(obj.a);
      expect(obj2.b).toBe(obj.b);
    });

    it('should partial clone deep values', () => {
      const obj = {
        a: {
          aa: {
            aaa: [{}, {}, {}],
          },
          ab: {},
        },
        b: {},
      };
      const obj2 = { ...obj };
      partialCloneSubpath(obj2, ['a', 'aa', 'aaa', '1']);

      // should have same Shape
      expect(obj2).toEqual(obj);

      // BUT different clonned objects by path
      expect(obj2.a).not.toBe(obj.a);
      expect(obj2.a.aa).not.toBe(obj.a.aa);
      expect(obj2.a.aa.aaa).not.toBe(obj.a.aa.aaa);
      expect(obj2.a.aa.aaa[1]).not.toBe(obj.a.aa.aaa[1]);

      // AND other objects should stay the same
      expect(obj2.a.aa.aaa[0]).toBe(obj.a.aa.aaa[0]);
      expect(obj2.a.aa.aaa[2]).toBe(obj.a.aa.aaa[2]);
      expect(obj2.a.ab).toBe(obj.a.ab);
      expect(obj2.b).toBe(obj.b);
    });
  });

  describe('hideField()', () => {
    it('should hide field by key and pass scalars untouched', () => {
      const o = { args: { a: 1 }, cnt: 123 };
      hideField(o, 'args');
      hideField(o, 'cnt');
      expect(o).toEqual({ args: 'Object {} was hidden', cnt: 123 });
    });

    it('should hide field with custom msg', () => {
      const o = { args: { a: 1 } };
      hideField(o, 'args', 'was removed for better view');
      expect(o).toEqual({ args: 'Object {} was removed for better view' });
    });

    it('should keep field if key in pathsFilter', () => {
      const o = { args: { a: 1 } };
      const pathsFilter = ['args'];
      hideField(o, 'args', undefined, pathsFilter);
      expect(o).toEqual({ args: { a: 1 } });
    });

    it('should hide `key.*` names', () => {
      const o = { key: { a: 1, b: {}, c: { cc: 1 } } };
      hideField(o, 'key.*');
      expect(o).toEqual({
        key: { a: 1, b: 'Object {} was hidden', c: 'Object {} was hidden' },
      });
    });

    it('should hide `key.*` names and keep if key in pathsFilter', () => {
      const o = { key: { a: 1, b: {}, c: { cc: 1 } } };
      const pathsFilter = ['key.c'];
      hideField(o, 'key.*', undefined, pathsFilter);
      expect(o).toEqual({
        key: { a: 1, b: 'Object {} was hidden', c: { cc: 1 } },
      });
    });

    it('should hide `key.subkey.*` names', () => {
      const o = { key: { subkey: { a: 1, b: {}, c: { cc: 1 } } } };
      hideField(o, 'key.subkey.*');
      expect(o).toEqual({
        key: {
          subkey: {
            a: 1,
            b: 'Object {} was hidden',
            c: 'Object {} was hidden',
          },
        },
      });
    });

    it('should hide `key.subkey.*` names and keep if key in pathsFilter', () => {
      const o = { key: { subkey: { a: 1, b: {}, c: { cc: 1 } } } };
      const pathsFilter = ['key.subkey.c'];
      hideField(o, 'key.subkey.*', undefined, pathsFilter);
      expect(o).toEqual({
        key: { subkey: { a: 1, b: 'Object {} was hidden', c: { cc: 1 } } },
      });
    });

    it('should hide `key.subkey.*` names in dotted path', () => {
      const o = { 'key.subkey': { a: 1, b: {}, c: { cc: 1 } } };
      hideField(o, 'key.subkey.*');
      expect(o).toEqual({
        'key.subkey': {
          a: 1,
          b: 'Object {} was hidden',
          c: 'Object {} was hidden',
        },
      });
    });

    it('should hide `key.subkey.*` names in dotted path and keep if key in pathsFilter', () => {
      const o = { 'key.subkey': { a: 1, b: {}, c: { cc: 1 } } };
      const pathsFilter = ['key.subkey.c'];
      hideField(o, 'key.subkey.*', undefined, pathsFilter);
      expect(o).toEqual({
        'key.subkey': { a: 1, b: 'Object {} was hidden', c: { cc: 1 } },
      });
    });

    it('should replace `key.subkey.*` on `key.subkey.b` in custom msg', () => {
      const o = { 'key.subkey': { a: 1, b: {}, c: {} } };
      hideField(
        o,
        'key.subkey.*',
        "use pathsFilter=['key.subkey.*'] to show this field (key.subkey.*)"
      );
      expect(o).toEqual({
        'key.subkey': {
          a: 1,
          b: "Object {} use pathsFilter=['key.subkey.b'] to show this field (key.subkey.b)",
          c: "Object {} use pathsFilter=['key.subkey.c'] to show this field (key.subkey.c)",
        },
      });
    });
  });
});
