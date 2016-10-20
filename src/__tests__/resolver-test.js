/* eslint-disable no-new */

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
} from 'graphql';
import GQC from '../__mocks__/gqc';
import Resolver from '../resolver';
import TypeComposer from '../typeComposer';
import InputTypeComposer from '../inputTypeComposer';


describe('Resolver', () => {
  let someTC;
  let resolver;

  beforeEach(() => {
    someTC = TypeComposer.create('ValidType');
    resolver = new Resolver({ name: 'find' });
  });


  it('should throw error if not passed name in opts', () => {
    expect(() => { new Resolver({}); }).to.throw();
  });


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

  it('should have setOutputType/getOutputType methods', () => {
    resolver.setOutputType(GraphQLString);
    expect(resolver.getOutputType()).equal(GraphQLString);

    expect(() => {
      resolver.setOutputType(new GraphQLInputObjectType({
        name: 'MyInput',
        fields: () => ({}),
      }));
    }).to.throw('provide correct OutputType');
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

  it('should remove args and return undefined for non-existing arg', () => {
    const argName = 'argField';
    const argConfig = { type: GraphQLString };
    resolver.setArg(argName, argConfig);
    resolver.removeArg(argName);
    expect(resolver.getArg(argName)).to.be.undefined;
  });


  it('should convert type as string to GraphQLType in outputType', () => {
    const resolver = new Resolver({
      name: 'customResolver',
      outputType: `String!`,
    });
    expect(resolver.outputType).instanceof(GraphQLNonNull);
    expect(resolver.outputType.ofType).equal(GraphQLString);
  });


  it('should convert type definition to GraphQLType in outputType', () => {
    const resolver = new Resolver({
      name: 'customResolver',
      outputType: `
        type SomeType {
          name: String
        }
      `,
    });
    expect(resolver.outputType).instanceof(GraphQLObjectType);
    expect(resolver.outputType.name).equal('SomeType');
  });


  it('should return data from resolve', async () => {
    const resolver = new Resolver({
      name: 'customResolver',
      resolve: () => ({ name: 'Nodkz' }),
      outputType: `
        type SomeType {
          name: String
        }
      `,
    });

    GQC.rootQuery().addRelation('resolveUser', () => ({
      resolver: resolver,
      args: {},
      projection: { _id: true },
    }));

    const schema = GQC.buildSchema();
    const result = await graphql(schema, '{ resolveUser { name } }');
    expect(
      result
    ).to.deep.equal({
      data: {
        resolveUser: {
          name: 'Nodkz',
        },
      },
    });
  });

  it('should have wrapArgs() method', () => {
    const newResolver = resolver.wrapArgs((prevArgs) => {
      return { ...prevArgs, arg1: 'String' };
    });

    expect(newResolver.getArg('arg1').type).equal(GraphQLString);
  });

  it('should have wrapOutputType() method', () => {
    const newResolver = resolver.wrapOutputType((prevOutputType) => { // eslint-disable-line
      return 'String';
    });

    expect(newResolver.getOutputType()).equal(GraphQLString);
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
      resolver.resolve = (rp) => {
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
      });

      newResolver.resolve({ args: { filter: { age: 15 } }, someKey: 16 });

      expect(rpSnap).property('rawQuery').deep.equal({ age: { $gt: 15 }, someKey: 16 });
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

      expect(newResolver.getArg('filter').defaultValue)
        .deep.equal({ name: 'User', age: 33 });
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
    const r2 = r1.wrapResolve((next) => (resolveParams) => {
      return 'function code';
    });

    expect(r1.getNestedName()).equal('find');
    expect(r2.getNestedName()).equal('wrapResolve(find)');
  });

  it('should on toString() call provide debug info with source code', () => {
    const r1 = new Resolver({ name: 'find' });
    const r2 = r1.wrapResolve((next) => (resolveParams) => {
      return 'function code';
    });

    expect(r2.toString()).to.have.string('function code');
  });


  it('should return type by path', () => {
    const rsv = new Resolver({
      name: 'find',
      outputType: 'type LonLat { lon: Float, lat: Float }',
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
      resolver.resolve = (rp) => {
        rpSnap = rp;
        return resolve(rp);
      };
      let whereSnap;
      const query = {
        where: (condition) => {
          whereSnap = condition;
        },
      };

      const newResolver = resolver.addSortArg({
        name: 'PRICE_ASC',
        description: 'Asc sort by non-null price',
        value: (resolveParams) => {
          resolveParams.query.where({ price: { $gt: 0 } }); // eslint-disable-line no-param-reassign
          return { price: 1 };
        },
        sortTypeNameFallback: 'SortEnum',
      });

      newResolver.resolve({ args: { sort: 'PRICE_ASC' }, query });
      expect(rpSnap).deep.property('args.sort').deep.equal({ price: 1 });
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
});
