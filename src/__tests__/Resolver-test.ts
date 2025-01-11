import {
  graphql,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLInputType,
} from '../graphql';
import schemaComposer from '../__mocks__/schemaComposer';
import { Resolver } from '../Resolver';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { SchemaComposer } from '../SchemaComposer';

declare let console: {
  log: any;
  dir: any;
  time: any;
  timeEnd: any;
};

describe('Resolver', () => {
  let resolver: Resolver<any, any, any>;

  beforeEach(() => {
    resolver = new Resolver({ name: 'find' }, schemaComposer);
  });

  it('should throw error if not passed name in opts', () => {
    expect(() => {
      new Resolver({}, schemaComposer);
    }).toThrowError();
  });

  it('should have getDescription/setDescription methods', () => {
    resolver.setDescription('Find users');
    expect(resolver.getDescription()).toBe('Find users');
  });

  it('should have getDeprecationReason/setDeprecationReason methods', () => {
    resolver.setDeprecationReason('Use another method');
    expect(resolver.getDeprecationReason()).toBe('Use another method');
  });

  it('should have getKind/setKind methods', () => {
    resolver.setKind('query');
    expect(resolver.getKind()).toBe('query');

    expect(() => {
      resolver.setKind('improperKind');
    }).toThrowError('You provide incorrect value');
  });

  describe('`type` methods', () => {
    it('should have setType/getType methods', () => {
      resolver.setType(GraphQLString);
      expect(resolver.getType()).toBe(GraphQLString);

      resolver.setType((sc) => {
        expect(sc).toBeInstanceOf(SchemaComposer);
        return 'Int';
      });
      expect(resolver.getType()).toBe(GraphQLInt);

      expect(() => {
        resolver.setType(
          new GraphQLInputObjectType({
            name: 'MyInput',
            fields: () => ({}),
          }) as any
        );
      }).toThrowError();
    });

    it('should convert type as string to GraphQLType', () => {
      const myResolver = new Resolver(
        {
          name: 'myResolver',
          type: 'String!',
        },
        schemaComposer
      );

      const type = myResolver.getType() as any;
      expect(type).toBeInstanceOf(GraphQLNonNull);
      expect(type.ofType).toBe(GraphQLString);
    });

    it('should convert type definition to GraphQLType', () => {
      const myResolver = new Resolver(
        {
          name: 'myResolver',
          type: `
          type SomeType {
            name: String
          }
        `,
        },
        schemaComposer
      );
      const type = myResolver.getType() as any;
      expect(type).toBeInstanceOf(GraphQLObjectType);
      expect(type.name).toBe('SomeType');
    });

    it('should accept ObjectTypeComposer for `type` option', () => {
      const typeTC = schemaComposer.createObjectTC('type SomeType22 { test: String }');
      const myResolver = new Resolver(
        {
          name: 'myResolver',
          type: typeTC,
        },
        schemaComposer
      );
      const type = myResolver.getType() as any;
      expect(type).toBeInstanceOf(GraphQLObjectType);
      expect(type.name).toBe('SomeType22');
    });

    it('should throw error on InputTypeComposer for `type` option', () => {
      const someInputITC = schemaComposer.createInputTC('input SomeInputType { add: String }');
      expect(() => {
        new Resolver(
          {
            name: 'myResolver',
            type: someInputITC as any,
          },
          schemaComposer
        );
      }).toThrowError('InputTypeComposer');
    });

    it('should accept Resolver for `type` option', () => {
      const someOtherResolver = new Resolver(
        {
          name: 'someOtherResolver',
          type: `
            type SomeType {
              name: String
            }
          `,
        },
        schemaComposer
      );

      const myResolver = new Resolver(
        {
          name: 'myResolver',
          type: someOtherResolver,
        },
        schemaComposer
      );
      const type = myResolver.getType() as any;
      expect(type).toBeInstanceOf(GraphQLObjectType);
      expect(type.name).toBe('SomeType');
    });

    it('should accept array for `type` option', () => {
      const myResolver = new Resolver(
        {
          name: 'myResolver',
          type: ['String'],
        },
        schemaComposer
      );
      const type = myResolver.getType() as any;
      expect(type).toBeInstanceOf(GraphQLList);
      expect(type.ofType).toBe(GraphQLString);
      expect(myResolver.getTypeName()).toBe('[String]');
    });

    it('should have wrapType() method', () => {
      const newResolver = resolver.wrapType(() => {
        return 'String';
      });
      expect(newResolver.getType()).toBe(GraphQLString);
    });
  });

  describe('`args` methods', () => {
    it('should have setArg and getArg methods', () => {
      resolver.setArg('a1', { type: GraphQLString });
      expect(resolver.getArgType('a1')).toBe(GraphQLString);

      resolver.setArg('a2', { type: 'String' });
      expect(resolver.getArgType('a2')).toBe(GraphQLString);

      resolver.setArg('a3', 'String');
      expect(resolver.getArgType('a3')).toBe(GraphQLString);
    });

    it('should return arg names in SDL', () => {
      resolver.setArgs({
        a: GraphQLString,
        b: [GraphQLString],
        c: '[Int!]!',
      });
      expect(resolver.getArgTypeName('a')).toBe('String');
      expect(resolver.getArgTypeName('b')).toBe('[String]');
      expect(resolver.getArgTypeName('c')).toBe('[Int!]!');
    });

    it('should have setArgs method', () => {
      resolver.setArgs({
        b1: { type: GraphQLString },
        b2: { type: 'String' },
        b3: 'String',
      });
      expect(resolver.getArgType('b1')).toBe(GraphQLString);
      expect(resolver.getArgType('b2')).toBe(GraphQLString);
      expect(resolver.getArgType('b3')).toBe(GraphQLString);
    });

    it('should have getArgType method', () => {
      resolver.setArgs({ b1: 'String' });
      expect(resolver.getArgType('b1')).toBe(GraphQLString);
      expect(() => resolver.getArgType('inexistent')).toThrowError();
    });

    it('should have setArgType method', () => {
      resolver.setArgs({ b1: 'String' });
      resolver.setArgType('b1', 'MySomeInputDefinedLater');
      expect(resolver.getArg('b1').type.getTypeName()).toBe('MySomeInputDefinedLater');
    });

    it('should return undefined for non-existing arg', () => {
      expect(resolver.hasArg('inexistent')).toBeFalsy();
    });

    it('should remove args', () => {
      const argName = 'argField';
      const argConfig = { type: GraphQLString };
      resolver.setArg(argName, argConfig);
      resolver.removeArg(argName);
      expect(resolver.hasArg(argName)).toBeFalsy();

      resolver.setArg('a1', 'String');
      resolver.setArg('a2', 'String');
      resolver.setArg('a3', 'String');
      resolver.removeArg(['a1', 'a2']);
      expect(resolver.hasArg('a1')).toBeFalsy();
      expect(resolver.hasArg('a2')).toBeFalsy();
      expect(resolver.hasArg('a3')).toBeTruthy();
    });

    it('should remove other args', () => {
      resolver.setArg('a1', 'String');
      resolver.setArg('a2', 'String');
      resolver.removeOtherArgs('a1');
      expect(resolver.hasArg('a1')).toBeTruthy();
      expect(resolver.hasArg('a2')).toBeFalsy();

      resolver.setArg('a1', 'String');
      resolver.setArg('a2', 'String');
      resolver.setArg('a3', 'String');
      resolver.removeOtherArgs(['a1', 'a2']);
      expect(resolver.hasArg('a1')).toBeTruthy();
      expect(resolver.hasArg('a2')).toBeTruthy();
      expect(resolver.hasArg('a3')).toBeFalsy();
    });

    it('should add args', () => {
      resolver.setArgs({
        b1: 'String',
      });
      resolver.addArgs({
        b2: 'String',
        b3: 'String',
      });
      expect(resolver.hasArg('b1')).toBe(true);
      expect(resolver.hasArg('b2')).toBe(true);
      expect(resolver.hasArg('b3')).toBe(true);
    });

    it('should have wrapArgs() method', () => {
      const newResolver = resolver.wrapArgs((prevArgs) => {
        return { ...prevArgs, arg1: 'String' };
      });

      expect(newResolver.getArgType('arg1')).toBe(GraphQLString);
    });

    it('should make args required', () => {
      resolver.setArgs({
        b1: { type: GraphQLString },
        b2: { type: 'String' },
        b3: 'String',
        b4: 'String',
      });
      resolver.makeRequired('b1');
      resolver.makeRequired(['b2', 'b3']);
      expect(resolver.isArgNonNull('b1')).toBe(true);
      expect(resolver.getArgType('b1')).toBeInstanceOf(GraphQLNonNull);
      expect(resolver.isArgNonNull('b2')).toBe(true);
      expect(resolver.isArgNonNull('b3')).toBe(true);
      expect(resolver.isArgNonNull('b4')).toBe(false);

      resolver.makeArgNonNull(['b3', 'b4']);
      expect(resolver.isArgNonNull('b3')).toBe(true);
      expect(resolver.isArgNonNull('b4')).toBe(true);
      resolver.makeArgNullable(['b3', 'b4']);
      expect(resolver.isArgNonNull('b3')).toBe(false);
      expect(resolver.isArgNonNull('b4')).toBe(false);
    });

    it('should make args optional', () => {
      resolver.setArgs({
        b1: { type: new GraphQLNonNull(GraphQLString) },
        b2: { type: 'String!' },
        b3: 'String!',
        b4: '[String]!',
      });
      resolver.makeOptional('b1');
      resolver.makeOptional(['b2', 'b3']);
      expect(resolver.isArgNonNull('b1')).toBe(false);
      expect(resolver.getArgTC('b1').getType()).toBe(GraphQLString);
      expect(resolver.isArgNonNull('b2')).toBe(false);
      expect(resolver.isArgNonNull('b3')).toBe(false);
      expect(resolver.isArgNonNull('b4')).toBe(true);
    });

    it('check Plural methods, wrap/unwrap from ListComposer', () => {
      resolver.setArgs({
        b1: { type: new GraphQLNonNull(GraphQLString) },
        b2: { type: '[String]' },
        b3: 'String!',
        b4: '[String!]!',
      });
      expect(resolver.isArgPlural('b1')).toBe(false);
      expect(resolver.isArgPlural('b2')).toBe(true);
      expect(resolver.isArgPlural('b3')).toBe(false);
      expect(resolver.isArgPlural('b4')).toBe(true);
      expect(resolver.isArgNonNull('b1')).toBe(true);
      expect(resolver.isArgNonNull('b2')).toBe(false);
      expect(resolver.isArgNonNull('b3')).toBe(true);
      expect(resolver.isArgNonNull('b4')).toBe(true);

      resolver.makeArgPlural(['b1', 'b2', 'b3', 'inexistent']);
      expect(resolver.isArgPlural('b1')).toBe(true);
      expect(resolver.isArgPlural('b2')).toBe(true);
      expect(resolver.isArgPlural('b3')).toBe(true);

      resolver.makeArgNonNull('b2');
      expect(resolver.isArgPlural('b2')).toBe(true);
      expect(resolver.isArgNonNull('b2')).toBe(true);
      resolver.makeArgNonPlural(['b2', 'b4', 'inexistent']);
      expect(resolver.isArgPlural('b2')).toBe(false);
      expect(resolver.isArgNonNull('b2')).toBe(true);
      expect(resolver.isArgPlural('b4')).toBe(false);
      resolver.makeArgNullable(['b2', 'b4', 'inexistent']);
      expect(resolver.isArgNonNull('b2')).toBe(false);
      expect(resolver.isArgNonNull('b4')).toBe(false);
    });

    describe('reorderArgs()', () => {
      it('should change args order', () => {
        resolver.setArgs({ a1: 'Int', a2: 'Int', a3: 'Int' });
        expect(resolver.getArgNames().join(',')).toBe('a1,a2,a3');
        resolver.reorderArgs(['a3', 'a2', 'a1']);
        expect(resolver.getArgNames().join(',')).toBe('a3,a2,a1');
      });

      it('should append not listed args', () => {
        resolver.setArgs({ a1: 'Int', a2: 'Int', a3: 'Int' });
        expect(resolver.getArgNames().join(',')).toBe('a1,a2,a3');
        resolver.reorderArgs(['a3']);
        expect(resolver.getArgNames().join(',')).toBe('a3,a1,a2');
      });

      it('should skip non existed args', () => {
        resolver.setArgs({ a1: 'Int', a2: 'Int', a3: 'Int' });
        expect(resolver.getArgNames().join(',')).toBe('a1,a2,a3');
        resolver.reorderArgs(['a22', 'a3', 'a55', 'a1', 'a2']);
        expect(resolver.getArgNames().join(',')).toBe('a3,a1,a2');
      });
    });

    describe('cloneArg()', () => {
      beforeEach(() => {
        resolver.setArgs({
          scalar: 'String',
          filter: {
            type: `input FilterInput {
              name: String,
              age: Int,
            }`,
            description: 'Data filtering arg',
          },
          mandatory: {
            type: `input Mandatory {
              data: String
            }`,
          },
          mandatoryScalar: 'String!',
        });
        resolver.makeRequired('mandatory');
      });

      it('should throw error if arg does not exists', () => {
        expect(() => {
          resolver.cloneArg('missingArg', 'NewTypeNameInput');
        }).toThrowError('Argument does not exist');
      });

      it('should throw error if arg is GraphqlNonNull wrapped scalar type', () => {
        expect(() => {
          resolver.cloneArg('mandatoryScalar', 'NewTypeNameInput');
        }).toThrowError('Cannot clone arg');
      });

      it('should throw error if arg is scalar type', () => {
        expect(() => {
          resolver.cloneArg('scalar', 'NewTypeNameInput');
        }).toThrowError('Cannot clone arg');
      });

      it('should throw error if provided incorrect new type name', () => {
        expect(() => {
          resolver.cloneArg('filter', '');
        }).toThrowError('should provide new type name');
        expect(() => {
          resolver.cloneArg('filter', '#3f3sf');
        }).toThrowError('should provide new type name');
        expect(() => {
          resolver.cloneArg('filter', 'FilterInput');
        }).toThrowError('It is equal to current name');
      });

      it('should clone GraphqlNonNull wrapped types', () => {
        resolver.cloneArg('mandatory', 'NewMandatory');
        expect((resolver.getArgType('mandatory') as any).ofType.name).toBe('NewMandatory');
      });

      it('should clone arg type', () => {
        resolver.cloneArg('filter', 'NewFilterInput');
        expect((resolver.getArgType('filter') as any).name).toBe('NewFilterInput');
        expect(resolver.getArgConfig('filter').description).toBe('Data filtering arg');
      });
    });

    it('should work with arg as thunk', () => {
      resolver.setArgs({
        a: (): string => 'String',
        b: (): InputTypeComposer<any> =>
          schemaComposer.createInputTC(`input ArgAsThunk1 { b: Int }`),
        c: (): GraphQLInputType =>
          new GraphQLNonNull(
            schemaComposer.createInputTC(`input ArgAsThunk2 { b: Int }`).getType()
          ),
      });
      expect(resolver.getArgType('a')).toBe(GraphQLString);
      expect((resolver.getArgType('b') as any).name).toBe('ArgAsThunk1');
      expect(resolver.getArgTC('c')).toBeInstanceOf(InputTypeComposer);
      expect(resolver.getArgTC('c').getTypeName()).toBe('ArgAsThunk2');
    });
  });

  describe('getFieldConfig()', () => {
    it('should return fieldConfig', () => {
      const fc = resolver.getFieldConfig();
      expect(fc).toHaveProperty('type');
      expect(fc).toHaveProperty('args');
      expect(fc).toHaveProperty('resolve');
    });

    it('should combine all resolve args to resolveParams', () => {
      let rp;
      resolver.resolve = (resolveParams) => {
        rp = resolveParams;
      };
      const fc = resolver.getFieldConfig() as any;
      fc.resolve('sourceData', 'argsData', 'contextData', 'infoData');
      expect(rp).toHaveProperty('source', 'sourceData');
      expect(rp).toHaveProperty('args', 'argsData');
      expect(rp).toHaveProperty('context', 'contextData');
      expect(rp).toHaveProperty('info', 'infoData');
    });

    it('should create `projection` property', () => {
      let rp;
      resolver.resolve = (resolveParams) => {
        rp = resolveParams;
      };
      const fc = resolver.getFieldConfig() as any;
      fc.resolve();
      expect(rp).toHaveProperty('projection');
    });

    it('should pass resolver `projection` property', () => {
      let rp = {} as Record<string, any>;
      const r = new Resolver({ name: 'find123' }, schemaComposer);
      r.projection.someField = 1;
      r.resolve = (resolveParams) => {
        rp = resolveParams;
      };
      const fc = r.getFieldConfig() as any;
      fc.resolve();
      expect(rp).toHaveProperty('projection');
      expect(rp.projection).toEqual({ someField: 1 });
    });

    it('should resolve args configs as thunk', () => {
      resolver.setArgs({
        arg1: 'String',
        arg2: (): string => 'String',
        arg3: {
          type: () => 'String',
        },
      });
      const fc = resolver.getFieldConfig() as any;
      expect(fc.args.arg1.type).toBe(GraphQLString);
      expect(fc.args.arg2.type).toBe(GraphQLString);
      expect(fc.args.arg3.type).toBe(GraphQLString);
    });
  });

  describe('wrap()', () => {
    it('should return new resolver', () => {
      const newResolver = resolver.wrap();
      expect(newResolver).toBeInstanceOf(Resolver);
      expect(newResolver).not.toBe(resolver);
    });

    it('should set internal name', () => {
      expect(resolver.wrap().name).toBe('wrap');
      expect(resolver.wrap((r) => r, { name: 'crazyWrap' }).name).toBe('crazyWrap');
    });

    it('should keep ref to source resolver in parent property', () => {
      expect(resolver.wrap().parent).toBe(resolver);
    });

    it('should return resolver from callback, cause it can be overridden there', () => {
      const customResolver = new Resolver({ name: 'find' }, schemaComposer);

      expect(
        resolver.wrap(() => {
          return customResolver;
        })
      ).toBe(customResolver);
    });
  });

  describe('wrapCloneArg()', () => {
    let newResolver: Resolver<any, any, any>;

    beforeEach(() => {
      resolver.setArgs({
        other: '[String]',
        filter: {
          type: `input FilterInput {
            name: String,
            age: Int,
          }`,
          description: 'Data filtering arg',
        },
        mandatory: {
          type: `input Mandatory {
            data: String
          }`,
        },
      });

      resolver.makeRequired('mandatory');
      newResolver = resolver
        .wrapCloneArg('filter', 'NewFilterInput')
        .wrapCloneArg('mandatory', 'NewMandatory');
    });

    it('should return new resolver', () => {
      expect(newResolver).not.toBe(resolver);
    });

    it('should clone type for argument', () => {
      expect(newResolver.getArg('filter')).not.toBe(resolver.getArg('filter'));
      expect(newResolver.getArgType('filter')).not.toBe(resolver.getArgType('filter'));
    });

    it('should change wrapped cloned type names', () => {
      const filterType = newResolver.getArgType('filter') as any;
      expect(filterType.name).toBe('NewFilterInput');
      expect(filterType.name).not.toBe((resolver.getArgType('filter') as any).name);
    });

    it('should keep untouched other args', () => {
      expect(newResolver.getArg('other').type).toBe(resolver.getArg('other').type);
      expect(newResolver.getArgType('other')).not.toBe(resolver.getArgType('other'));
    });

    it('should unwrap GraphQLNonNull types', () => {
      expect(newResolver.getArg('mandatory')).not.toBe(resolver.getArg('mandatory'));
      expect(newResolver.getArgType('mandatory')).not.toBe(resolver.getArgType('mandatory'));
    });

    it('should change wrapped cloned type names', () => {
      const mandatoryType = newResolver.getArgType('mandatory') as any;
      expect(mandatoryType.ofType.name).toBe('NewMandatory');
      expect(mandatoryType.ofType.name).not.toBe(
        (resolver.getArgType('mandatory') as any).ofType.name
      );
    });
  });

  it('should return data from resolve', async () => {
    const myResolver = new Resolver(
      {
        name: 'customResolver',
        resolve: () => ({ name: 'Nodkz' }),
        type: `
        type SomeType {
          name: String
        }
      `,
      },
      schemaComposer
    );

    schemaComposer.Query.addRelation('resolveUser', {
      resolver: () => myResolver,
      projection: { _id: true },
    });

    const schema = schemaComposer.buildSchema();
    const result = await graphql({ schema, source: '{ resolveUser { name } }' });
    expect(result).toEqual({
      data: {
        resolveUser: {
          name: 'Nodkz',
        },
      },
    });
  });

  describe('addFilterArg', () => {
    it('should add arg to filter and setup default value', () => {
      const newResolver = resolver.addFilterArg({
        name: 'age',
        type: 'Int!',
        defaultValue: 20,
        description: 'Age filter',
        filterTypeNameFallback: 'FilterUniqueNameInput',
      });

      expect(resolver.hasArg('filter')).toBeFalsy();

      const filterCfg = newResolver.getArgConfig('filter') as any;
      expect(filterCfg).toBeTruthy();
      expect(filterCfg.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(filterCfg.defaultValue).toEqual({ age: 20 });

      const filterITC = schemaComposer.createInputTC(filterCfg.type);
      expect(filterITC.getField('age').description).toBe('Age filter');
      const ageType = filterITC.getFieldType('age') as any;
      expect(ageType).toBeInstanceOf(GraphQLNonNull);
      expect(ageType.ofType).toBe(GraphQLInt);
    });

    it('should prepare resolveParams.rawQuery when `resolve` called', async () => {
      let rpSnap: any;
      const resolve = resolver.resolve;
      resolver.resolve = (rp) => {
        rpSnap = rp;
        return resolve(rp);
      };

      const newResolver = resolver
        .addFilterArg({
          name: 'age',
          type: 'Int!',
          description: 'Age filter',
          query: (query, value, resolveParams) => {
            query.age = { $gt: value };
            query.someKey = resolveParams.someKey;
          },
          filterTypeNameFallback: 'FilterUniqueNameInput',
        })
        .addFilterArg({
          name: 'isActive',
          type: 'Boolean!',
          description: 'Active status filter',
          query: async (query, value) => {
            query.checkPermissions = await Promise.resolve('accessGranted');
            query.isActive = value;
          },
          filterTypeNameFallback: 'FilterOtherUniqueNameInput',
        });

      await newResolver.resolve({
        args: { filter: { age: 15, isActive: false } },
        someKey: 16,
      });

      expect(rpSnap.rawQuery).toEqual({
        age: { $gt: 15 },
        isActive: false,
        someKey: 16,
        checkPermissions: 'accessGranted',
      });
    });

    it('should extend default value', () => {
      resolver.setArg('filter', {
        type: new GraphQLInputObjectType({
          name: 'MyFilterInput',
          fields: {
            name: {
              type: GraphQLString,
            },
          },
        }),
        defaultValue: {
          name: 'User',
        },
      });

      const newResolver = resolver.addFilterArg({
        name: 'age',
        type: 'Int',
        defaultValue: 33,
        filterTypeNameFallback: 'FilterUniqueNameInput',
      });

      expect(newResolver.getArgConfig('filter').defaultValue).toEqual({
        name: 'User',
        age: 33,
      });
    });

    it('should throw errors if provided incorrect options', () => {
      expect(() => {
        resolver.addFilterArg({} as any);
      }).toThrowError('`opts.name` is required');

      expect(() => {
        resolver.addFilterArg({ name: 'price' } as any);
      }).toThrowError('`opts.type` is required');

      expect(() => {
        resolver.addFilterArg({
          name: 'price',
          type: 'input {min: Int}',
        });
      }).toThrowError('opts.filterTypeNameFallback: string');
    });
  });

  it('should return nested name for Resolver', () => {
    const r1 = new Resolver({ name: 'find' }, schemaComposer);
    const r2 = r1.wrapResolve(() => () => {
      return 'function code';
    });

    expect(r1.getNestedName()).toBe('find');
    expect(r2.getNestedName()).toBe('wrapResolve(find)');
  });

  it('should on toString() call provide debug info with source code', () => {
    const r1 = new Resolver({ name: 'find' }, schemaComposer);
    const r2 = r1.wrapResolve(() => () => {
      return 'function code';
    });

    expect(r2.toString()).toContain('function code');
  });

  it('should return type by path', () => {
    const rsv = new Resolver(
      {
        name: 'find',
        type: 'type LonLat { lon: Float, lat: Float }',
        args: {
          distance: 'Int!',
        },
      },
      schemaComposer
    );

    expect((rsv.get('lat') as any).getType()).toBe(GraphQLFloat);
    expect((rsv.get('@distance') as any).getType()).toBe(GraphQLInt);
  });

  describe('addSortArg', () => {
    it('should extend SortEnum by new value', () => {
      resolver.setArg('sort', {
        type: new GraphQLEnumType({
          name: 'MySortEnum',
          values: {
            AGE_ASC: {},
          },
        }),
      });

      const newResolver = resolver.addSortArg({
        name: 'PRICE_ASC',
        description: 'Asc sort by non-null price',
        value: { price: 1 },
      });

      const sortEnum = newResolver.getArgType('sort') as GraphQLEnumType;
      expect(sortEnum.parseValue('AGE_ASC')).toBe('AGE_ASC');
      expect(sortEnum.parseValue('PRICE_ASC')).toEqual({ price: 1 });
    });

    it('should prepare sort value when `resolve` called', () => {
      let rpSnap: any;
      const resolve = resolver.resolve;
      resolver.resolve = (rp) => {
        rpSnap = rp;
        return resolve(rp);
      };
      let whereSnap;
      const query = {
        where: (condition: any) => {
          whereSnap = condition;
        },
      };

      const newResolver = resolver.addSortArg({
        name: 'PRICE_ASC',
        description: 'Asc sort by non-null price',
        value: (resolveParams) => {
          resolveParams.query.where({ price: { $gt: 0 } });
          return { price: 1 };
        },
        sortTypeNameFallback: 'SortEnum',
      });

      newResolver.resolve({ args: { sort: 'PRICE_ASC' }, query });
      expect(rpSnap.args.sort).toEqual({ price: 1 });
      expect(whereSnap).toEqual({ price: { $gt: 0 } });
    });

    it('should work with arg defined as TypeStringDefinition', () => {
      resolver.setArg('sort', `enum CustomEnum { ID_ASC, ID_DESC }`);
      resolver.addSortArg({
        name: 'PRICE_ASC',
        value: 123,
      });

      const sortType = resolver.getArgType('sort') as any;
      const etc = schemaComposer.createEnumTC(sortType);
      expect(etc.getFieldNames()).toEqual(['ID_ASC', 'ID_DESC', 'PRICE_ASC']);
    });

    it('should throw errors if provided incorrect options', () => {
      expect(() => {
        resolver.addSortArg({} as any);
      }).toThrowError('`opts.name` is required');

      expect(() => {
        resolver.addSortArg({ name: 'PRICE_ASC' } as any);
      }).toThrowError('`opts.value` is required');

      expect(() => {
        resolver.addSortArg({
          name: 'PRICE_ASC',
          value: 123,
        });
      }).toThrowError('opts.sortTypeNameFallback: string');

      expect(() => {
        resolver.setArg('sort', { type: GraphQLInt });
        resolver.addSortArg({
          name: 'PRICE_ASC',
          value: 123,
        });
      }).toThrowError("Resolver must have 'sort' arg with EnumType");
    });
  });
  it('should have chain methods', () => {
    expect(resolver.setArgs({})).toBe(resolver);
    expect(resolver.setArg('a1', 'String')).toBe(resolver);
    expect(resolver.addArgs({ a2: 'input LL { f1: Int, f2: Int }' })).toBe(resolver);
    expect(resolver.removeArg('a1')).toBe(resolver);
    expect(resolver.removeOtherArgs('a2')).toBe(resolver);
    expect(resolver.reorderArgs(['a1'])).toBe(resolver);
    expect(resolver.cloneArg('a2', 'NewTypeName')).toBe(resolver);
    expect(resolver.makeRequired('a2')).toBe(resolver);
    expect(resolver.makeOptional('a2')).toBe(resolver);
    expect(resolver.setResolve(() => {})).toBe(resolver);
    expect(resolver.setType('String')).toBe(resolver);
    expect(resolver.setKind('query')).toBe(resolver);
    expect(resolver.setDescription('Find method')).toBe(resolver);
  });

  describe('debug methods', () => {
    const origConsole = global.console;
    beforeEach(() => {
      global.console = {
        log: jest.fn(),
        dir: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
      } as any;
    });
    afterEach(() => {
      global.console = origConsole;
    });

    describe('debugExecTime()', () => {
      it('should measure execution time', async () => {
        const r1 = new Resolver(
          {
            name: 'find',
            displayName: 'User.find()',
            resolve: () => {},
          },
          schemaComposer
        );
        await r1.debugExecTime().resolve(undefined as any);

        expect(console.time.mock.calls[0]).toEqual(['Execution time for User.find()']);
        expect(console.timeEnd.mock.calls[0]).toEqual(['Execution time for User.find()']);
      });
    });

    describe('debugParams()', () => {
      it('should show resolved payload', () => {
        const r1 = new Resolver(
          {
            name: 'find',
            displayName: 'User.find()',
            resolve: () => {},
          },
          schemaComposer
        );
        r1.debugParams().resolve({
          source: { id: 1 },
          args: { limit: 1 },
          context: { isAdmin: true, db: {} },
          info: { fieldName: 'a', otherAstFields: {} } as any,
        });

        expect(console.log.mock.calls[0]).toEqual(['ResolverResolveParams for User.find():']);
        expect(console.dir.mock.calls[0]).toEqual([
          {
            args: { limit: 1 },
            context: { db: 'Object {} [[hidden]]', isAdmin: true },
            info: 'Object {} [[hidden]]',
            source: { id: 1 },
            '[debug note]':
              'Some data was [[hidden]] to display this fields use debugParams("info context.db")',
          },
          { colors: true, depth: 5 },
        ]);
      });

      it('should show filtered resolved payload', () => {
        const r1 = new Resolver(
          {
            name: 'find',
            displayName: 'User.find()',
            resolve: () => {},
          },
          schemaComposer
        );
        r1.debugParams('args, args.sort, source.name').resolve({
          source: { id: 1, name: 'Pavel' },
          args: { limit: 1, sort: 'id' },
        });

        expect(console.log.mock.calls[0]).toEqual(['ResolverResolveParams for User.find():']);
        expect(console.dir.mock.calls[0]).toEqual([
          {
            args: { limit: 1, sort: 'id' },
            'args.sort': 'id',
            'source.name': 'Pavel',
          },
          { colors: true, depth: 5 },
        ]);
      });
    });

    describe('debugPayload()', () => {
      it('should show resolved payload', async () => {
        const r1 = new Resolver(
          {
            name: 'find',
            displayName: 'User.find()',
            resolve: async () => ({ a: 123 }),
          },
          schemaComposer
        );
        await r1.debugPayload().resolve(undefined as any);

        expect(console.log.mock.calls[0]).toEqual(['Resolved Payload for User.find():']);
        expect(console.dir.mock.calls[0]).toEqual([{ a: 123 }, { colors: true, depth: 5 }]);
      });

      it('should show filtered resolved payload', async () => {
        const r1 = new Resolver(
          {
            name: 'find',
            displayName: 'User.find()',
            resolve: async () => ({ a: 123, b: 345, c: [0, 1, 2, 3] }),
          },
          schemaComposer
        );
        await r1.debugPayload(['b', 'c.3']).resolve(undefined as any);

        expect(console.log.mock.calls[0]).toEqual(['Resolved Payload for User.find():']);
        expect(console.dir.mock.calls[0]).toEqual([
          { b: 345, 'c.3': 3 },
          { colors: true, depth: 5 },
        ]);
      });

      it('should show rejected payload', async () => {
        const err = new Error('Request failed');
        const r1 = new Resolver(
          {
            name: 'find',
            displayName: 'User.find()',
            resolve: async () => {
              throw err;
            },
          },
          schemaComposer
        );
        await r1
          .debugPayload()
          .resolve(undefined as any)
          .catch(() => {});

        expect(console.log.mock.calls[0]).toEqual(['Rejected Payload for User.find():']);
        expect(console.log.mock.calls[1]).toEqual([err]);
      });
    });

    describe('debug()', () => {
      it('should output execution time, resolve params and payload', async () => {
        const r1 = new Resolver(
          {
            name: 'find',
            displayName: 'User.find()',
            resolve: () => ({ a: 123, b: 345, c: [0, 1, 2, 3] }),
          },
          schemaComposer
        );

        await r1
          .debug({
            params: 'args.sort source.name',
            payload: 'b, c.3',
          })
          .resolve({
            source: { id: 1, name: 'Pavel' },
            args: { limit: 1, sort: 'id' },
          });

        expect(console.time.mock.calls[0]).toEqual(['Execution time for User.find()']);
        expect(console.timeEnd.mock.calls[0]).toEqual(['Execution time for User.find()']);

        expect(console.log.mock.calls[0]).toEqual([
          'ResolverResolveParams for debugExecTime(User.find()):',
        ]);
        expect(console.dir.mock.calls[0]).toEqual([
          {
            'args.sort': 'id',
            'source.name': 'Pavel',
          },
          { colors: true, depth: 2 },
        ]);

        expect(console.log.mock.calls[1]).toEqual([
          'Resolved Payload for debugParams(debugExecTime(User.find())):',
        ]);
        expect(console.dir.mock.calls[1]).toEqual([
          { b: 345, 'c.3': 3 },
          { colors: true, depth: 2 },
        ]);
      });
    });
  });

  describe('getArgTC()', () => {
    const myResolver = new Resolver(
      {
        name: 'someResolver',
        type: 'String',
        args: {
          scalar: 'String',
          list: '[Int]',
          obj: schemaComposer.createInputTC(`input RCustomInputType { name: String }`),
          objArr: [schemaComposer.createInputTC(`input RCustomInputType2 { name: String }`)],
        },
      },
      schemaComposer
    );

    it('should return InputTypeComposer for object argument', () => {
      const objTC = myResolver.getArgTC('obj');
      expect(objTC.getTypeName()).toBe('RCustomInputType');
    });

    it('should return InputTypeComposer for wrapped object argument', () => {
      const objTC = myResolver.getArgTC('objArr');
      expect(objTC.getTypeName()).toBe('RCustomInputType2');

      expect(myResolver.getArgTC('scalar').getTypeName()).toBe('String');

      // should unwrap Int from List
      expect(myResolver.getArgTC('list').getTypeName()).toBe('Int');
    });

    it('should work getArgITC() with type checks', () => {
      const objTC = myResolver.getArgITC('objArr');
      expect(objTC.getTypeName()).toBe('RCustomInputType2');

      expect(() => myResolver.getArgITC('scalar').getTypeName()).toThrow(
        'must be InputTypeComposer, but received ScalarTypeComposer'
      );
      expect(() => myResolver.getArgITC('list').getTypeName()).toThrow(
        'must be InputTypeComposer, but received ScalarTypeComposer'
      );
    });
  });

  describe('getTypeComposer()', () => {
    it('should return ObjectTypeComposer for GraphQLObjectType', () => {
      const r = new Resolver(
        {
          name: 'find',
          type: `type MyOutputType { name: String }`,
          displayName: 'User.find()',
          resolve: () => {},
        },
        schemaComposer
      );
      expect(r.getType()).toBeInstanceOf(GraphQLObjectType);
      expect(r.getTypeComposer()).toBeInstanceOf(ObjectTypeComposer);
      expect(r.getTypeComposer().getTypeName()).toBe('MyOutputType');
    });

    it('should unwrap List and NonNull GraphQLObjectType', () => {
      schemaComposer.createObjectTC(`type MyOutputType { name: String }`);

      const r = new Resolver(
        {
          name: 'find',
          type: '[MyOutputType!]!',
          displayName: 'User.find()',
          resolve: () => {},
        },
        schemaComposer
      );

      expect(r.type.getTypeName()).toBe('[MyOutputType!]!');
      const type = r.getType() as any;
      expect(type).toBeInstanceOf(GraphQLNonNull);
      expect(type.ofType).toBeInstanceOf(GraphQLList);
      expect(r.getTypeComposer()).toBeInstanceOf(ObjectTypeComposer);
      expect(r.getTypeComposer().getTypeName()).toBe('MyOutputType');
    });

    it('should throw error if output type is not GraphQLObjectType', () => {
      const r = new Resolver(
        {
          name: 'find',
          type: 'String',
          displayName: 'User.find()',
          resolve: () => {},
        },
        schemaComposer
      );
      expect(r.type).toBeInstanceOf(ScalarTypeComposer);
      expect(r.type.getType()).toBe(GraphQLString);
      expect(r.getType()).toBe(GraphQLString);
      expect(r.getTypeComposer()).toBeInstanceOf(ScalarTypeComposer);
      expect(() => r.getOTC()).toThrow();
    });
  });

  describe('withMiddlewares()', () => {
    let r: Resolver;
    const log = [] as string[];
    beforeEach(() => {
      r = new Resolver(
        {
          name: 'find',
          type: 'String',
          displayName: 'User.find()',
          resolve: () => {
            log.push('call User.find()');
            return 'users result';
          },
        },
        schemaComposer
      );
    });

    it('should apply middlewares', async () => {
      const mw1 = async (resolve: any, source: any, args: any, context: any, info: any) => {
        log.push('m1.before');
        const res = await resolve(source, args, context, info);
        log.push('m1.after');
        return res;
      };
      const mw2 = async (resolve: any, source: any, args: any, context: any, info: any) => {
        log.push('m2.before');
        const res = await resolve(source, args, context, info);
        log.push('m2.after');
        return res;
      };

      const res = await r.withMiddlewares([mw1, mw2]).resolve({});
      expect(res).toBe('users result');
      expect(log).toEqual(['m1.before', 'm2.before', 'call User.find()', 'm2.after', 'm1.after']);
    });
  });

  describe('clone()', () => {
    it('should clone resolver', () => {
      const cloned = resolver.clone({ name: 'newFind' });
      expect(cloned).not.toBe(resolver);
      expect(cloned.name).toBe('newFind');
    });

    it('resolver type should not be cloned', () => {
      const UserTC = schemaComposer.createObjectTC(`type User { field1: String }`);
      resolver.setType(UserTC);
      const cloned = resolver.clone({ name: 'newFind' });
      expect(cloned.getTypeComposer()).toBe(UserTC);
    });

    it('args config should be different', () => {
      const cloned = resolver.clone({ name: 'newFind' });
      cloned.setArg('arg123', 'String');
      expect(cloned.hasArg('arg123')).toBeTruthy();
      expect(resolver.hasArg('arg123')).toBeFalsy();
    });

    it('projection config should be different', () => {
      resolver.projection = { field1: true };
      const cloned = resolver.clone({ name: 'newFind' });
      cloned.projection.field2 = true;
      expect(cloned.projection).toEqual({ field1: true, field2: true });
      expect(resolver.projection).toEqual({ field1: true });
    });
  });

  describe('cloneTo()', () => {
    let anotherSchemaComposer: SchemaComposer<any>;
    beforeEach(() => {
      anotherSchemaComposer = new SchemaComposer();
    });

    it('should clone resolver', () => {
      const cloned = resolver.cloneTo(anotherSchemaComposer);
      expect(cloned).not.toBe(resolver);
      expect(cloned.name).toBe('find');
    });

    it('resolver type should be cloned', () => {
      const UserTC = schemaComposer.createObjectTC(`type User { field1: String }`);
      resolver.setType(UserTC);
      const cloned = resolver.cloneTo(anotherSchemaComposer);
      expect(cloned.getTypeComposer()).not.toBe(UserTC);
      expect(cloned.getTypeName()).toBe('User');
    });

    it('args config should be different', () => {
      const cloned = resolver.cloneTo(anotherSchemaComposer);
      cloned.setArg('arg123', 'String');
      expect(cloned.hasArg('arg123')).toBeTruthy();
      expect(resolver.hasArg('arg123')).toBeFalsy();
    });

    it('projection config should be different', () => {
      resolver.projection = { field1: true };
      const cloned = resolver.cloneTo(anotherSchemaComposer);
      cloned.projection.field2 = true;
      expect(cloned.projection).toEqual({ field1: true, field2: true });
      expect(resolver.projection).toEqual({ field1: true });
    });
  });
});
