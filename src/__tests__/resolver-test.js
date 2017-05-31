/* eslint-disable no-new, no-unused-vars */

import { expect } from 'chai';
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
} from 'graphql';
import GQC from '../__mocks__/gqc';
import Resolver from '../resolver';
import TypeComposer from '../typeComposer';
import InputTypeComposer from '../inputTypeComposer';

describe('Resolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new Resolver({ name: 'find' });
  });

  it('should throw error if not passed name in opts', () => {
    expect(() => {
      new Resolver({});
    }).to.throw();
  });

  it('should have getDescription/setDescription methods', () => {
    resolver.setDescription('Find users');
    expect(resolver.getDescription()).equal('Find users');
  });

  it('should have getKind/setKind methods', () => {
    resolver.setKind('query');
    expect(resolver.getKind()).equal('query');

    expect(() => {
      resolver.setKind('unproperKind');
    }).to.throw('You provide incorrect value');
  });

  describe('`type` methods', () => {
    it('should have setType/getType methods', () => {
      resolver.setType(GraphQLString);
      expect(resolver.getType()).equal(GraphQLString);

      expect(() => {
        resolver.setType(
          new GraphQLInputObjectType({
            name: 'MyInput',
            fields: () => ({}),
          })
        );
      }).to.throw();
    });

    it('should convert type as string to GraphQLType', () => {
      const myResolver = new Resolver({
        name: 'myResolver',
        type: 'String!',
      });
      expect(myResolver.type).instanceof(GraphQLNonNull);
      expect(myResolver.type.ofType).equal(GraphQLString);
    });

    it('should convert type definition to GraphQLType', () => {
      const myResolver = new Resolver({
        name: 'myResolver',
        type: `
          type SomeType {
            name: String
          }
        `,
      });
      expect(myResolver.type).instanceof(GraphQLObjectType);
      expect(myResolver.type.name).equal('SomeType');
    });

    it('should accept TypeComposer for `type` option', () => {
      const typeTC = TypeComposer.create('type SomeType22 { test: String }');
      const myResolver = new Resolver({
        name: 'myResolver',
        type: typeTC,
      });
      expect(myResolver.type).instanceof(GraphQLObjectType);
      expect(myResolver.type.name).equal('SomeType22');
    });

    it('should throw error on InputTypeComposer for `type` option', () => {
      const someInputITC = InputTypeComposer.create('input SomeInputType { add: String }');
      expect(() => {
        new Resolver({
          name: 'myResolver',
          type: someInputITC,
        });
      }).to.throw('InputTypeComposer');
    });

    it('should accept Resolver for `type` option', () => {
      const someOtherResolver = new Resolver({
        name: 'someOtherResolver',
        type: `
          type SomeType {
            name: String
          }
        `,
      });

      const myResolver = new Resolver({
        name: 'myResolver',
        type: someOtherResolver,
      });
      expect(myResolver.type).instanceof(GraphQLObjectType);
      expect(myResolver.type.name).equal('SomeType');
    });

    it('should accept array for `type` option', () => {
      const myResolver = new Resolver({
        name: 'myResolver',
        type: ['String'],
      });
      expect(myResolver.type).instanceof(GraphQLList);
      expect(myResolver.type.ofType).equal(GraphQLString);
    });

    it('should have wrapType() method', () => {
      const newResolver = resolver.wrapType((prevType) => {
        // eslint-disable-line
        return 'String';
      });

      expect(newResolver.getType()).equal(GraphQLString);
    });
  });

  describe('`args` methods', () => {
    it('should have setArg and getArg methods', () => {
      resolver.setArg('a1', { type: GraphQLString });
      expect(resolver.getArg('a1').type).equal(GraphQLString);

      resolver.setArg('a2', { type: 'String' });
      expect(resolver.getArg('a2').type).equal(GraphQLString);

      resolver.setArg('a3', 'String');
      expect(resolver.getArg('a3').type).equal(GraphQLString);
    });

    it('should have setArgs method', () => {
      resolver.setArgs({
        b1: { type: GraphQLString },
        b2: { type: 'String' },
        b3: 'String',
      });
      expect(resolver.getArg('b1').type).equal(GraphQLString);
      expect(resolver.getArg('b2').type).equal(GraphQLString);
      expect(resolver.getArg('b3').type).equal(GraphQLString);
    });

    it('should have getArgType method', () => {
      resolver.setArgs({
        b1: 'String',
      });
      expect(resolver.getArgType('b1')).equal(GraphQLString);
      expect(resolver.getArgType('unexisted')).to.be.undefined;
    });

    it('should return undefined for non-existing arg', () => {
      expect(resolver.getArg('unexisted')).to.be.undefined;
    });

    it('should remove args', () => {
      const argName = 'argField';
      const argConfig = { type: GraphQLString };
      resolver.setArg(argName, argConfig);
      resolver.removeArg(argName);
      expect(resolver.getArg(argName)).to.be.undefined;

      resolver.setArg('a1', 'String');
      resolver.setArg('a2', 'String');
      resolver.setArg('a3', 'String');
      resolver.removeArg(['a1', 'a2']);
      expect(resolver.getArg('a1')).to.be.undefined;
      expect(resolver.getArg('a2')).to.be.undefined;
      expect(resolver.getArg('a3')).to.be.ok;
    });

    it('should remove other args', () => {
      resolver.setArg('a1', 'String');
      resolver.setArg('a2', 'String');
      resolver.removeOtherArgs('a1');
      expect(resolver.getArg('a1')).to.be.ok;
      expect(resolver.getArg('a2')).to.be.undefined;

      resolver.setArg('a1', 'String');
      resolver.setArg('a2', 'String');
      resolver.setArg('a3', 'String');
      resolver.removeOtherArgs(['a1', 'a2']);
      expect(resolver.getArg('a1')).to.be.ok;
      expect(resolver.getArg('a2')).to.be.ok;
      expect(resolver.getArg('a3')).to.be.undefined;
    });

    it('should add args', () => {
      resolver.setArgs({
        b1: 'String',
      });
      resolver.addArgs({
        b2: 'String',
        b3: 'String',
      });
      expect(resolver.hasArg('b1')).to.be.true;
      expect(resolver.hasArg('b2')).to.be.true;
      expect(resolver.hasArg('b3')).to.be.true;
    });

    it('should have wrapArgs() method', () => {
      const newResolver = resolver.wrapArgs(prevArgs => {
        return { ...prevArgs, arg1: 'String' };
      });

      expect(newResolver.getArg('arg1').type).equal(GraphQLString);
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
      expect(resolver.isRequired('b1')).to.be.true;
      expect(resolver.getArgType('b1')).instanceof(GraphQLNonNull);
      expect(resolver.isRequired('b2')).to.be.true;
      expect(resolver.isRequired('b3')).to.be.true;
      expect(resolver.isRequired('b4')).to.be.false;
    });

    it('should make args optional', () => {
      resolver.setArgs({
        b1: { type: new GraphQLNonNull(GraphQLString) },
        b2: { type: 'String!' },
        b3: 'String!',
        b4: 'String!',
      });
      resolver.makeOptional('b1');
      resolver.makeOptional(['b2', 'b3']);
      expect(resolver.isRequired('b1')).to.be.false;
      expect(resolver.getArgType('b1')).equal(GraphQLString);
      expect(resolver.isRequired('b2')).to.be.false;
      expect(resolver.isRequired('b3')).to.be.false;
      expect(resolver.isRequired('b4')).to.be.true;
    });

    describe('reorderArgs()', () => {
      it('should change args order', () => {
        resolver.setArgs({ a1: 'Int', a2: 'Int', a3: 'Int' });
        expect(resolver.getArgNames().join(',')).to.equal('a1,a2,a3');
        resolver.reorderArgs(['a3', 'a2', 'a1']);
        expect(resolver.getArgNames().join(',')).to.equal('a3,a2,a1');
      });

      it('should append not listed args', () => {
        resolver.setArgs({ a1: 'Int', a2: 'Int', a3: 'Int' });
        expect(resolver.getArgNames().join(',')).to.equal('a1,a2,a3');
        resolver.reorderArgs(['a3']);
        expect(resolver.getArgNames().join(',')).to.equal('a3,a1,a2');
      });

      it('should skip non existed args', () => {
        resolver.setArgs({ a1: 'Int', a2: 'Int', a3: 'Int' });
        expect(resolver.getArgNames().join(',')).to.equal('a1,a2,a3');
        resolver.reorderArgs(['a22', 'a3', 'a55', 'a1', 'a2']);
        expect(resolver.getArgNames().join(',')).to.equal('a3,a1,a2');
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
        });
      });

      it('should throw error if arg does not exists', () => {
        expect(() => {
          resolver.cloneArg('missingArg', 'NewTypeNameInput');
        }).to.throw('Argument does not exist');
      });

      it('should throw error if arg is scalar type', () => {
        expect(() => {
          resolver.cloneArg('scalar', 'NewTypeNameInput');
        }).to.throw('should be GraphQLInputObjectType');
      });

      it('should throw error if provided incorrect new type name', () => {
        expect(() => {
          resolver.cloneArg('filter', '');
        }).to.throw('should provide new type name');
        expect(() => {
          resolver.cloneArg('filter', '#3fdsf');
        }).to.throw('should provide new type name');
        expect(() => {
          resolver.cloneArg('filter', 'FilterInput');
        }).to.throw('It is equal to current name');
      });

      it('should clone arg type', () => {
        resolver.cloneArg('filter', 'NewFilterInput');
        expect(resolver.getArgType('filter').name).to.equal('NewFilterInput');
        expect(resolver.getArg('filter').description).to.equal('Data filtering arg');
      });
    });
  });

  describe('getFieldConfig()', () => {
    it('should return fieldConfig', () => {
      const fc = resolver.getFieldConfig();
      expect(fc).to.have.property('type');
      expect(fc).to.have.property('args');
      expect(fc).to.have.property('description');
      expect(fc).to.have.property('resolve');
    });

    it('should combine all resolve args to resolveParams', () => {
      let rp;
      resolver.resolve = (resolveParams) => {
        rp = resolveParams;
      };
      const fc = resolver.getFieldConfig();
      fc.resolve('sourceData', 'argsData', 'contextData', 'infoData');
      expect(rp).to.have.property('source', 'sourceData');
      expect(rp).to.have.property('args', 'argsData');
      expect(rp).to.have.property('context', 'contextData');
      expect(rp).to.have.property('info', 'infoData');
    });

    it('should create `projection` property', () => {
      let rp;
      resolver.resolve = (resolveParams) => {
        rp = resolveParams;
      };
      const fc = resolver.getFieldConfig();
      fc.resolve();
      expect(rp).to.have.property('projection');
    });

    it('should resolve args configs as thunk', () => {
      let rp;
      resolver.setArgs({
        arg1: 'String',
        arg2: () => 'String',
        arg3: {
          type: () => 'String',
        },
      });
      const fc = resolver.getFieldConfig();
      expect(fc.args.arg1.type).to.equal(GraphQLString);
      expect(fc.args.arg2.type).to.equal(GraphQLString);
      expect(fc.args.arg3.type).to.equal(GraphQLString);
    });
  });

  describe('wrapCloneArg()', () => {
    let newResolver;

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
      });

      newResolver = resolver.wrapCloneArg('filter', 'NewFilterInput');
    });

    it('should return new resolver', () => {
      expect(newResolver).to.not.equal(resolver);
    });

    it('should clone type for argument', () => {
      expect(newResolver.getArg('filter')).to.not.equal(resolver.getArg('filter'));
      expect(newResolver.getArgType('filter')).to.not.equal(resolver.getArgType('filter'));
    });

    it('should keep untouched other args', () => {
      expect(newResolver.getArg('other')).to.equal(resolver.getArg('other'));
      expect(newResolver.getArgType('other')).to.equal(resolver.getArgType('other'));
    });
  });

  it('should return data from resolve', async () => {
    const myResolver = new Resolver({
      name: 'customResolver',
      resolve: () => ({ name: 'Nodkz' }),
      type: `
        type SomeType {
          name: String
        }
      `,
    });

    GQC.rootQuery().addRelation('resolveUser', () => ({
      resolver: myResolver,
      args: {},
      projection: { _id: true },
    }));

    const schema = GQC.buildSchema();
    const result = await graphql(schema, '{ resolveUser { name } }');
    expect(result).to.deep.equal({
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

      expect(resolver.getArg('filter')).to.be.not.ok;

      const filterCfg = newResolver.getArg('filter');
      expect(filterCfg).to.be.ok;
      expect(filterCfg.type).instanceof(GraphQLInputObjectType);
      expect(filterCfg.defaultValue).deep.equal({ age: 20 });

      const filterITC = new InputTypeComposer(filterCfg.type);
      expect(filterITC.getField('age').description).equal('Age filter');
      expect(filterITC.getFieldType('age')).instanceof(GraphQLNonNull);
      expect(filterITC.getFieldType('age').ofType).equal(GraphQLInt);
    });

    it('should prepare resolveParams.rawQuery when `resolve` called', () => {
      let rpSnap;
      const resolve = resolver.resolve;
      resolver.resolve = rp => {
        rpSnap = rp;
        return resolve(rp);
      };

      const newResolver = resolver.addFilterArg({
        name: 'age',
        type: 'Int!',
        description: 'Age filter',
        query: (query, value, resolveParams) => {
          query.age = { $gt: value }; // eslint-disable-line no-param-reassign
          query.someKey = resolveParams.someKey; // eslint-disable-line no-param-reassign
        },
        filterTypeNameFallback: 'FilterUniqueNameInput',
      })
      .addFilterArg({
        name: 'isActive',
        type: 'Boolean!',
        description: 'Active status filter',
        query: (query, value, resolveParams) => {
          query.isActive = value; // eslint-disable-line no-param-reassign
        },
        filterTypeNameFallback: 'FilterOtherUniqueNameInput',
      });

      newResolver.resolve({ args: { filter: { age: 15, isActive: false } }, someKey: 16 });

      expect(rpSnap).property('rawQuery').deep.equal({ age: { $gt: 15 }, isActive: false, someKey: 16 });
    });

    it('should extend default value', () => {
      resolver.setArg('filter', {
        type: new GraphQLInputObjectType({
          name: 'MyFilterInput',
          fields: {
            name: 'String',
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

      expect(newResolver.getArg('filter').defaultValue).deep.equal({ name: 'User', age: 33 });
    });

    it('should throw errors if provided incorrect options', () => {
      expect(() => {
        resolver.addFilterArg({});
      }).to.throw('`opts.name` is required');

      expect(() => {
        resolver.addFilterArg({
          name: 'price',
        });
      }).to.throw('`opts.type` is required');

      expect(() => {
        resolver.addFilterArg({
          name: 'price',
          type: 'input {min: Int}',
        });
      }).to.throw('opts.filterTypeNameFallback: string');
    });
  });

  it('should return nested name for Resolver', () => {
    const r1 = new Resolver({ name: 'find' });
    const r2 = r1.wrapResolve(next =>
      resolveParams => {
        // eslint-disable-line
        return 'function code';
      });

    expect(r1.getNestedName()).equal('find');
    expect(r2.getNestedName()).equal('wrapResolve(find)');
  });

  it('should on toString() call provide debug info with source code', () => {
    const r1 = new Resolver({ name: 'find' });
    const r2 = r1.wrapResolve(next =>
      resolveParams => {
        // eslint-disable-line
        return 'function code';
      });

    expect(r2.toString()).to.have.string('function code');
  });

  it('should return type by path', () => {
    const rsv = new Resolver({
      name: 'find',
      type: 'type LonLat { lon: Float, lat: Float }',
      args: {
        distance: 'Int!',
      },
    });

    expect(rsv.get('lat')).equal(GraphQLFloat);
    expect(rsv.get('@distance')).equal(GraphQLInt);
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

      const sortEnum = newResolver.getArg('sort').type;
      expect(sortEnum.parseValue('AGE_ASC')).equal('AGE_ASC');
      expect(sortEnum.parseValue('PRICE_ASC')).deep.equal({ price: 1 });
    });

    it('should prepare sort value when `resolve` called', () => {
      let rpSnap;
      const resolve = resolver.resolve;
      resolver.resolve = rp => {
        rpSnap = rp;
        return resolve(rp);
      };
      let whereSnap;
      const query = {
        where: condition => {
          whereSnap = condition;
        },
      };

      const newResolver = resolver.addSortArg({
        name: 'PRICE_ASC',
        description: 'Asc sort by non-null price',
        value: resolveParams => {
          resolveParams.query.where({ price: { $gt: 0 } }); // eslint-disable-line no-param-reassign
          return { price: 1 };
        },
        sortTypeNameFallback: 'SortEnum',
      });

      newResolver.resolve({ args: { sort: 'PRICE_ASC' }, query });
      expect(rpSnap).nested.property('args.sort').deep.equal({ price: 1 });
      expect(whereSnap).deep.equal({ price: { $gt: 0 } });
    });

    it('should throw errors if provided incorrect options', () => {
      expect(() => {
        resolver.addSortArg({});
      }).to.throw('`opts.name` is required');

      expect(() => {
        resolver.addSortArg({
          name: 'PRICE_ASC',
        });
      }).to.throw('`opts.value` is required');

      expect(() => {
        resolver.addSortArg({
          name: 'PRICE_ASC',
          value: 123,
        });
      }).to.throw('opts.sortTypeNameFallback: string');

      expect(() => {
        resolver.setArg('sort', { type: GraphQLInt });
        resolver.addSortArg({
          name: 'PRICE_ASC',
          value: 123,
        });
      }).to.throw('should have `sort` arg with type GraphQLEnumType');
    });
  });

  it('should have chainable methods', () => {
    expect(resolver.setArgs({})).equal(resolver);
    expect(resolver.setArg('a1', 'String')).equal(resolver);
    expect(resolver.addArgs({ a2: 'input LL { f1: Int, f2: Int }' })).equal(resolver);
    expect(resolver.removeArg('a1')).equal(resolver);
    expect(resolver.removeOtherArgs('a2')).equal(resolver);
    expect(resolver.reorderArgs(['a1'])).equal(resolver);
    expect(resolver.cloneArg('a2', 'a3')).equal(resolver);
    expect(resolver.makeRequired('a2')).equal(resolver);
    expect(resolver.makeOptional('a2')).equal(resolver);
    expect(resolver.setResolve(() => {})).equal(resolver);
    expect(resolver.setType('String')).equal(resolver);
    expect(resolver.setKind('query')).equal(resolver);
    expect(resolver.setDescription('Find method')).equal(resolver);
  });
});
