/* @flow strict */

import { SchemaComposer } from '..';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import {
  graphql,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLDirective,
  DirectiveLocation,
  GraphQLSkipDirective,
  GraphQLIncludeDirective,
  GraphQLDeprecatedDirective,
  GraphQLScalarType,
} from '../graphql';

describe('SchemaComposer', () => {
  it('should implements `add` method', () => {
    const sc = new SchemaComposer();
    const SomeTC = sc.createObjectTC({ name: 'validType' });
    sc.add(SomeTC);
    expect(sc.get('validType')).toBe(SomeTC);
  });

  it('should implements `get` method', () => {
    const sc = new SchemaComposer();
    const SomeTC = sc.createObjectTC({ name: 'validType' });
    sc.add(SomeTC);
    expect(sc.get('validType')).toBe(SomeTC);
  });

  it('should implements `has` method`', () => {
    const sc = new SchemaComposer();
    const SomeTC = sc.createObjectTC({ name: 'validType' });
    sc.add(SomeTC);
    expect(sc.has('validType')).toBe(true);
    expect(sc.has('unexistedType')).toBe(false);
  });

  describe('getOrCreateOTC()', () => {
    it('should create TC if not exists', () => {
      const sc = new SchemaComposer();
      const UserTC = sc.getOrCreateOTC('User');
      expect(UserTC).toBeInstanceOf(ObjectTypeComposer);
      expect(sc.has('User')).toBeTruthy();
      expect(sc.hasInstance('User', ObjectTypeComposer)).toBeTruthy();
      expect(sc.getOTC('User')).toBe(UserTC);
    });

    it('should create TC if not exists with onCreate', () => {
      const sc = new SchemaComposer();
      const UserTC = sc.getOrCreateOTC('User', tc => {
        tc.setDescription('User model');
      });
      expect(UserTC.getDescription()).toBe('User model');
    });

    it('should return already created TC without onCreate', () => {
      const sc = new SchemaComposer();
      const UserTC = sc.getOrCreateOTC('User', tc => {
        tc.setDescription('User model');
      });
      const UserTC2 = sc.getOrCreateOTC('User', tc => {
        tc.setDescription('updated description');
      });
      expect(UserTC).toBe(UserTC2);
      expect(UserTC.getDescription()).toBe('User model');
    });
  });

  describe('getOrCreateITC()', () => {
    it('should create ITC if not exists', () => {
      const sc = new SchemaComposer();
      const UserITC = sc.getOrCreateITC('UserInput');
      expect(UserITC).toBeInstanceOf(InputTypeComposer);
      expect(sc.has('UserInput')).toBeTruthy();
      expect(sc.hasInstance('UserInput', InputTypeComposer)).toBeTruthy();
      expect(sc.getITC('UserInput')).toBe(UserITC);
    });

    it('should create ITC if not exists with onCreate', () => {
      const sc = new SchemaComposer();
      const UserITC = sc.getOrCreateITC('UserInput', tc => {
        tc.setDescription('User input');
      });
      expect(UserITC.getDescription()).toBe('User input');
    });

    it('should return already created ITC without onCreate', () => {
      const sc = new SchemaComposer();
      const UserITC = sc.getOrCreateITC('UserInput', tc => {
        tc.setDescription('User input');
      });
      const UserITC2 = sc.getOrCreateITC('UserInput', tc => {
        tc.setDescription('updated description');
      });
      expect(UserITC).toBe(UserITC2);
      expect(UserITC.getDescription()).toBe('User input');
    });
  });

  describe('getOrCreateSTC()', () => {
    it('should create STC if not exists', () => {
      const sc = new SchemaComposer();
      const UIntSTC = sc.getOrCreateSTC('UInt');
      expect(UIntSTC).toBeInstanceOf(ScalarTypeComposer);
      expect(sc.has('UInt')).toBeTruthy();
      expect(sc.hasInstance('UInt', ScalarTypeComposer)).toBeTruthy();
      expect(sc.getSTC('UInt')).toBe(UIntSTC);
    });

    it('should create UTC if not exists with onCreate', () => {
      const sc = new SchemaComposer();
      const UIntTC = sc.getOrCreateSTC('Uint', tc => {
        tc.setDescription('Unsigned int');
      });
      expect(UIntTC.getDescription()).toBe('Unsigned int');
    });

    it('should return already created STC without onCreate', () => {
      const sc = new SchemaComposer();
      const UIntTC = sc.getOrCreateSTC('UInt', tc => {
        tc.setDescription('Positive int');
      });
      const UIntTC2 = sc.getOrCreateSTC('UInt', tc => {
        tc.setDescription('updated description');
      });
      expect(UIntTC).toBe(UIntTC2);
      expect(UIntTC.getDescription()).toBe('Positive int');
    });
  });

  describe('getOrCreateETC()', () => {
    it('should create ETC if not exists', () => {
      const sc = new SchemaComposer();
      const UserETC = sc.getOrCreateETC('UserEnum');
      expect(UserETC).toBeInstanceOf(EnumTypeComposer);
      expect(sc.has('UserEnum')).toBeTruthy();
      expect(sc.hasInstance('UserEnum', EnumTypeComposer)).toBeTruthy();
      expect(sc.getETC('UserEnum')).toBe(UserETC);
    });

    it('should create ETC if not exists with onCreate', () => {
      const sc = new SchemaComposer();
      const UserETC = sc.getOrCreateETC('UserEnum', tc => {
        tc.setDescription('User enum');
      });
      expect(UserETC.getDescription()).toBe('User enum');
    });

    it('should return already created ETC without onCreate', () => {
      const sc = new SchemaComposer();
      const UserETC = sc.getOrCreateETC('UserEnum', tc => {
        tc.setDescription('User enum');
      });
      const UserETC2 = sc.getOrCreateETC('UserEnum', tc => {
        tc.setDescription('updated description');
      });
      expect(UserETC).toBe(UserETC2);
      expect(UserETC.getDescription()).toBe('User enum');
    });
  });

  describe('getOrCreateIFTC()', () => {
    it('should create IFTC if not exists', () => {
      const sc = new SchemaComposer();
      const UserIFTC = sc.getOrCreateIFTC('UserInterface');
      expect(UserIFTC).toBeInstanceOf(InterfaceTypeComposer);
      expect(sc.has('UserInterface')).toBeTruthy();
      expect(sc.hasInstance('UserInterface', InterfaceTypeComposer)).toBeTruthy();
      expect(sc.getIFTC('UserInterface')).toBe(UserIFTC);
    });

    it('should create IFTC if not exists with onCreate', () => {
      const sc = new SchemaComposer();
      const UserIFTC = sc.getOrCreateIFTC('UserInterface', tc => {
        tc.setDescription('User interface');
      });
      expect(UserIFTC.getDescription()).toBe('User interface');
    });

    it('should return already created IFTC without onCreate', () => {
      const sc = new SchemaComposer();
      const UserIFTC = sc.getOrCreateIFTC('UserInterface', tc => {
        tc.setDescription('User interface');
      });
      const UserIFTC2 = sc.getOrCreateIFTC('UserInterface', tc => {
        tc.setDescription('updated description');
      });
      expect(UserIFTC).toBe(UserIFTC2);
      expect(UserIFTC.getDescription()).toBe('User interface');
    });
  });

  describe('buildSchema()', () => {
    it('should throw error, if root fields not defined', () => {
      const sc = new SchemaComposer();
      sc.clear();

      expect(() => {
        sc.buildSchema();
      }).toThrowError();
    });

    it('should accept additional types', () => {
      const sc = new SchemaComposer();
      sc.Query.addFields({ time: 'Int' });
      const me1 = sc.createObjectTC('type Me1 { a: Int }').getType();
      const me2 = sc.createObjectTC('type Me2 { a: Int }').getType();
      const schema = sc.buildSchema({ types: [me1, me1, me2] });

      expect(schema._typeMap.Me1).toEqual(me1);
      expect(schema._typeMap.Me2).toEqual(me2);
    });

    it('should provide proper Schema when provided only Query', async () => {
      const sc = new SchemaComposer();
      sc.Query.addFields({ num: 'Int' });
      const schema = sc.buildSchema();
      expect(
        await graphql({
          schema,
          source: `
            query {
              num
            }
          `,
        })
      ).toEqual({ data: { num: null } });
    });

    it('should throw error if only Mutation provided', async () => {
      const sc = new SchemaComposer();
      sc.Mutation.addFields({ num: 'Int' });
      expect(() => {
        sc.buildSchema();
      }).toThrow('Must be initialized Query type');
    });
  });

  describe('removeEmptyTypes()', () => {
    it('should remove fields with Types which have no fields', () => {
      const sc = new SchemaComposer();
      const TypeWithoutFieldsTC = sc.getOrCreateOTC('Stub');
      TypeWithoutFieldsTC.setFields({});

      const ViewerTC = sc.getOrCreateOTC('Viewer');
      ViewerTC.setFields({
        name: 'String',
        stub: TypeWithoutFieldsTC,
      });

      /* eslint-disable */
      const oldConsoleLog = console.log;
      global.console.log = jest.fn();

      sc.removeEmptyTypes(ViewerTC);

      expect(console.log).lastCalledWith(
        "graphql-compose: Delete field 'Viewer.stub' with type 'Stub', cause it does not have fields."
      );
      global.console.log = oldConsoleLog;
      /* eslint-enable */

      expect(ViewerTC.hasField('stub')).toBe(false);
    });

    it('should not produce Maximum call stack size exceeded', () => {
      const sc = new SchemaComposer();
      const UserTC = sc.getOrCreateOTC('User');
      UserTC.setField('friend', UserTC);

      sc.removeEmptyTypes(UserTC);
    });
  });

  describe('root type getters', () => {
    it('Query', () => {
      const sc = new SchemaComposer();
      expect(sc.Query).toBe(sc.Query);
      expect(sc.Query.getTypeName()).toBe('Query');
    });

    it('Mutation', () => {
      const sc = new SchemaComposer();
      expect(sc.Mutation).toBe(sc.Mutation);
      expect(sc.Mutation.getTypeName()).toBe('Mutation');
    });

    it('Subscription', () => {
      const sc = new SchemaComposer();
      expect(sc.Subscription).toBe(sc.Subscription);
      expect(sc.Subscription.getTypeName()).toBe('Subscription');
    });
  });

  describe('SchemaMustHaveType', () => {
    const sc = new SchemaComposer();
    const tc = sc.createObjectTC(`type Me { name: String }`);

    sc.addSchemaMustHaveType(tc);
    expect(sc._schemaMustHaveTypes).toContain(tc);

    sc.clear();
    expect(sc._schemaMustHaveTypes).not.toContain(tc);

    sc.addSchemaMustHaveType(tc);
    sc.Query.addFields({ time: 'String' });
    const schema = sc.buildSchema();
    expect(schema._typeMap.Me).toEqual(tc.getType());
  });

  describe('getOTC', () => {
    it('should return ObjectTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createObjectTC(`
          type Author {
            name: String
          }
        `);
      expect(sc.getOTC('Author')).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should return GraphQLObjectType as ObjectTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.add(
        new GraphQLObjectType({
          name: 'Author',
          fields: { name: { type: GraphQLString } },
        })
      );
      expect(sc.getOTC('Author')).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should throw error for incorrect type', () => {
      const sc = new SchemaComposer();
      sc.createInputTC(`
        input Author {
          name: String
        }
      `);
      expect(() => sc.getOTC('Author')).toThrowError(
        'Cannot find ObjectTypeComposer with name Author'
      );
    });
  });

  describe('getITC', () => {
    it('should return InputTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createInputTC(`
          input Author {
            name: String
          }
        `);
      expect(sc.getITC('Author')).toBeInstanceOf(InputTypeComposer);
    });

    it('should return GraphQLInputObjectType as InputTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.add(
        new GraphQLInputObjectType({
          name: 'Author',
          fields: { name: { type: GraphQLString } },
        })
      );
      expect(sc.getITC('Author')).toBeInstanceOf(InputTypeComposer);
    });

    it('should throw error for incorrect type', () => {
      const sc = new SchemaComposer();
      sc.createObjectTC(`
        type Author {
          name: String
        }
      `);
      expect(() => sc.getITC('Author')).toThrowError(
        'Cannot find InputTypeComposer with name Author'
      );
    });
  });

  describe('getSTC', () => {
    it('should return ScalarTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createScalarTC(`scalar UInt`);
      expect(sc.getSTC('UInt')).toBeInstanceOf(ScalarTypeComposer);
    });

    it('should return GraphQLScalarType as ScalarTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.add(
        new GraphQLScalarType({
          name: 'SomeInt',
          serialize: () => {},
        })
      );
      expect(sc.getSTC('SomeInt')).toBeInstanceOf(ScalarTypeComposer);
    });

    it('should throw error for incorrect type', () => {
      const sc = new SchemaComposer();
      sc.createObjectTC(`
        type Sort {
          name: String
        }
      `);
      expect(() => sc.getSTC('Sort')).toThrowError('Cannot find ScalarTypeComposer with name Sort');
    });
  });

  describe('getETC', () => {
    it('should return EnumTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createEnumTC(`
          enum Sort {
            ASC DESC
          }
        `);
      expect(sc.getETC('Sort')).toBeInstanceOf(EnumTypeComposer);
    });

    it('should return GraphQLEnumType as EnumTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.add(
        new GraphQLEnumType({
          name: 'Sort',
          values: { ASC: { value: 'ASC' } },
        })
      );
      expect(sc.getETC('Sort')).toBeInstanceOf(EnumTypeComposer);
    });

    it('should throw error for incorrect type', () => {
      const sc = new SchemaComposer();
      sc.createObjectTC(`
        type Sort {
          name: String
        }
      `);
      expect(() => sc.getETC('Sort')).toThrowError('Cannot find EnumTypeComposer with name Sort');
    });
  });

  describe('getIFTC', () => {
    it('should return InterfaceTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createInterfaceTC(`
          interface IFace {
            name: String
          }
        `);
      expect(sc.getIFTC('IFace')).toBeInstanceOf(InterfaceTypeComposer);
    });

    it('should return GraphQLInterfaceType as InterfaceTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.add(
        new GraphQLInterfaceType({
          name: 'IFace',
          fields: { name: { type: GraphQLString } },
        })
      );
      expect(sc.getIFTC('IFace')).toBeInstanceOf(InterfaceTypeComposer);
    });

    it('should throw error for incorrect type', () => {
      const sc = new SchemaComposer();
      sc.createObjectTC(`
        type IFace {
          name: String
        }
      `);
      expect(() => sc.getIFTC('IFace')).toThrowError(
        'Cannot find InterfaceTypeComposer with name IFace'
      );
    });
  });

  describe('getAnyTC()', () => {
    it('should return ObjectTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createObjectTC(`type Object1 { name: String }`);
      expect(sc.getAnyTC('Object1')).toBeInstanceOf(ObjectTypeComposer);
      sc.add(
        new GraphQLObjectType({
          name: 'Object2',
          fields: () => ({}),
        })
      );
      expect(sc.getAnyTC('Object2')).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should return InputTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createInputTC(`input Input1 { name: String }`);
      expect(sc.getAnyTC('Input1')).toBeInstanceOf(InputTypeComposer);
      sc.add(
        new GraphQLInputObjectType({
          name: 'Input2',
          fields: () => ({}),
        })
      );
      expect(sc.getAnyTC('Input2')).toBeInstanceOf(InputTypeComposer);
    });

    it('should return ScalarTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createScalarTC(`scalar Scalar1`);
      expect(sc.getAnyTC('Scalar1')).toBeInstanceOf(ScalarTypeComposer);
      sc.add(
        new GraphQLScalarType({
          name: 'Scalar2',
          serialize: () => {},
        })
      );
      expect(sc.getAnyTC('Scalar2')).toBeInstanceOf(ScalarTypeComposer);
    });

    it('should return EnumTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createEnumTC(`enum Enum1 { A B }`);
      expect(sc.getAnyTC('Enum1')).toBeInstanceOf(EnumTypeComposer);
      sc.add(
        new GraphQLEnumType({
          name: 'Enum2',
          values: {},
        })
      );
      expect(sc.getAnyTC('Enum2')).toBeInstanceOf(EnumTypeComposer);
    });

    it('should return InterfaceTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.createInterfaceTC(`interface Iface1 { f1: Int }`);
      expect(sc.getAnyTC('Iface1')).toBeInstanceOf(InterfaceTypeComposer);
      sc.add(
        new GraphQLInterfaceType({
          name: 'Iface2',
          fields: () => ({}),
        })
      );
      expect(sc.getAnyTC('Iface2')).toBeInstanceOf(InterfaceTypeComposer);
    });

    it('should return UnionTypeComposer', () => {
      const sc = new SchemaComposer();
      const a = sc.createObjectTC(`type A { f: Int }`);
      sc.createUnionTC(`union Union1 = A`);
      expect(sc.getAnyTC('Union1')).toBeInstanceOf(UnionTypeComposer);
      sc.add(
        new GraphQLUnionType({
          name: 'Union2',
          types: [a.getType()],
        })
      );
      expect(sc.getAnyTC('Union2')).toBeInstanceOf(UnionTypeComposer);
    });
  });

  describe('add()', () => {
    it('should add ObjectTypeComposer', () => {
      const sc = new SchemaComposer();
      const tc = ObjectTypeComposer.createTemp('User');
      const typeName = sc.add(tc);
      expect(typeName).toBe('User');
      expect(sc.get('User')).toBe(tc);
      expect(sc.getOTC('User')).toBe(tc);
      sc.add(`type Object { a: Int }`);
      expect(sc.get('Object')).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should add InputTypeComposer', () => {
      const sc = new SchemaComposer();
      const itc = InputTypeComposer.createTemp('UserInput');
      const typeName = sc.add(itc);
      expect(typeName).toBe('UserInput');
      expect(sc.get('UserInput')).toBe(itc);
      expect(sc.getITC('UserInput')).toBe(itc);
      sc.add(`input Object { a: Int }`);
      expect(sc.get('Object')).toBeInstanceOf(InputTypeComposer);
    });

    it('should add ScalarTypeComposer', () => {
      const sc = new SchemaComposer();
      const stc = ScalarTypeComposer.createTemp('UserScalar');
      const typeName = sc.add(stc);
      expect(typeName).toBe('UserScalar');
      expect(sc.get('UserScalar')).toBe(stc);
      expect(sc.getSTC('UserScalar')).toBe(stc);
      sc.add(`scalar Object`);
      expect(sc.get('Object')).toBeInstanceOf(ScalarTypeComposer);
    });

    it('should add EnumTypeComposer', () => {
      const sc = new SchemaComposer();
      const etc = EnumTypeComposer.createTemp('UserEnum');
      const typeName = sc.add(etc);
      expect(typeName).toBe('UserEnum');
      expect(sc.get('UserEnum')).toBe(etc);
      expect(sc.getETC('UserEnum')).toBe(etc);
      sc.add(`enum Object { A }`);
      expect(sc.get('Object')).toBeInstanceOf(EnumTypeComposer);
    });

    it('should add GraphQLObjectType', () => {
      const sc = new SchemaComposer();
      const t = new GraphQLObjectType({
        name: 'NativeType',
        fields: (() => {}: any),
      });
      const typeName = sc.add(t);
      expect(typeName).toBe('NativeType');
      expect(sc.get('NativeType')).toBe(t);
    });

    it('should add InterfaceTypeComposer', () => {
      const sc = new SchemaComposer();
      const iftc = InterfaceTypeComposer.createTemp('UserInterface');
      const typeName = sc.add(iftc);
      expect(typeName).toBe('UserInterface');
      expect(sc.get('UserInterface')).toBe(iftc);
      expect(sc.getIFTC('UserInterface')).toBe(iftc);
      sc.add(`interface Object { a: Int }`);
      expect(sc.get('Object')).toBeInstanceOf(InterfaceTypeComposer);
    });

    it('should add UnionTypeComposer', () => {
      const sc = new SchemaComposer();
      const utc = UnionTypeComposer.createTemp('UserUnion');
      const typeName = sc.add(utc);
      expect(typeName).toBe('UserUnion');
      expect(sc.get('UserUnion')).toBe(utc);
      expect(sc.getUTC('UserUnion')).toBe(utc);
      sc.add(`type A { f: Int }`);
      sc.add(`union Object = A`);
      expect(sc.get('Object')).toBeInstanceOf(UnionTypeComposer);
    });
  });

  describe('addAsComposer()', () => {
    it('should add ObjectTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.addAsComposer(`type Object1 { name: String }`);
      sc.addAsComposer(ObjectTypeComposer.createTemp(`type Object2 { name: String }`));
      sc.addAsComposer(
        new GraphQLObjectType({
          name: 'Object3',
          fields: () => ({}),
        })
      );

      expect(sc.get('Object1')).toBeInstanceOf(ObjectTypeComposer);
      expect(sc.get('Object2')).toBeInstanceOf(ObjectTypeComposer);
      expect(sc.get('Object3')).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should return InputTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.addAsComposer(`input Object1 { name: String }`);
      sc.addAsComposer(InputTypeComposer.createTemp(`input Object2 { name: String }`));
      sc.addAsComposer(
        new GraphQLInputObjectType({
          name: 'Object3',
          fields: () => ({}),
        })
      );

      expect(sc.get('Object1')).toBeInstanceOf(InputTypeComposer);
      expect(sc.get('Object2')).toBeInstanceOf(InputTypeComposer);
      expect(sc.get('Object3')).toBeInstanceOf(InputTypeComposer);
    });

    it('should return ScalarTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.addAsComposer(`scalar Object1`);
      sc.addAsComposer(ScalarTypeComposer.createTemp(`scalar Object2`));
      sc.addAsComposer(
        new GraphQLScalarType({
          name: 'Object3',
          serialize: () => ({}),
        })
      );

      expect(sc.get('Object1')).toBeInstanceOf(ScalarTypeComposer);
      expect(sc.get('Object2')).toBeInstanceOf(ScalarTypeComposer);
      expect(sc.get('Object3')).toBeInstanceOf(ScalarTypeComposer);
    });

    it('should return EnumTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.addAsComposer(`enum Object1 { A B }`);
      sc.addAsComposer(EnumTypeComposer.createTemp(`enum Object2 { A B }`));
      sc.addAsComposer(
        new GraphQLEnumType({
          name: 'Object3',
          values: {},
        })
      );

      expect(sc.get('Object1')).toBeInstanceOf(EnumTypeComposer);
      expect(sc.get('Object2')).toBeInstanceOf(EnumTypeComposer);
      expect(sc.get('Object3')).toBeInstanceOf(EnumTypeComposer);
    });

    it('should return InterfaceTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.addAsComposer(`interface Object1 { a: Int }`);
      sc.addAsComposer(InterfaceTypeComposer.createTemp(`interface Object2 { a: Int }`));
      sc.addAsComposer(
        new GraphQLInterfaceType({
          name: 'Object3',
          fields: () => ({}),
        })
      );

      expect(sc.get('Object1')).toBeInstanceOf(InterfaceTypeComposer);
      expect(sc.get('Object2')).toBeInstanceOf(InterfaceTypeComposer);
      expect(sc.get('Object3')).toBeInstanceOf(InterfaceTypeComposer);
    });

    it('should return UnionTypeComposer', () => {
      const sc = new SchemaComposer();
      const a = sc.createObjectTC(`type A { f: Int }`);
      sc.addAsComposer(`union Object1 = A`);
      sc.addAsComposer(UnionTypeComposer.createTemp(`union Object2 = A`));
      sc.addAsComposer(
        new GraphQLUnionType({
          name: 'Object3',
          types: [a.getType()],
        })
      );

      expect(sc.get('Object1')).toBeInstanceOf(UnionTypeComposer);
      expect(sc.get('Object2')).toBeInstanceOf(UnionTypeComposer);
      expect(sc.get('Object3')).toBeInstanceOf(UnionTypeComposer);
    });
  });

  describe('addTypeDefs', () => {
    it('should parse types from SDL', () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        type Author {
          name: String
          some(arg: Int): String
        }
        input AuthorInput {
          name: String
        }
        scalar MyInt
        enum Sort {
          ASC
          DESC
        }
        interface PersonI {
          name: String
        }
      `);

      expect(sc.get('Author')).toBeInstanceOf(ObjectTypeComposer);
      expect(sc.get('AuthorInput')).toBeInstanceOf(InputTypeComposer);
      expect(sc.get('MyInt')).toBeInstanceOf(ScalarTypeComposer);
      expect(sc.get('Sort')).toBeInstanceOf(EnumTypeComposer);
      expect(sc.get('PersonI')).toBeInstanceOf(InterfaceTypeComposer);
    });

    it('should parse cross referenced types from SDL', () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        type Author {
          posts: [Post]
        }
        type Post {
          author: Author
        }
      `);

      expect(sc.get('Author')).toBeInstanceOf(ObjectTypeComposer);
      expect(sc.get('Post')).toBeInstanceOf(ObjectTypeComposer);

      // Post type should be the same instance
      const Post = sc.getTC('Post').getType();
      const PostInAuthor = sc
        .getTC('Author')
        .getFieldTC('posts')
        .getType();
      expect(Post).toBe(PostInAuthor);

      // Author type should be the same instance
      const Author = sc.getTC('Author').getType();
      const AuthorInPost = sc
        .getTC('Post')
        .getFieldTC('author')
        .getType();
      expect(Author).toBe(AuthorInPost);
    });

    it('should replace existed types', () => {
      // This behavior maybe changed in future.
      // Need to gather more use cases and problems.
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        type Author {
          name: String
          some(arg: Int): String
        }
      `);
      expect(sc.getOTC('Author').hasFieldArg('some', 'arg')).toBeTruthy();

      sc.addTypeDefs(`
        type Author {
          name: String
        }
      `);
      expect(sc.getOTC('Author').hasFieldArg('some', 'arg')).toBeFalsy();
    });

    it('should merge Root types', () => {
      const sc = new SchemaComposer();
      sc.Query.addFields({ field1: 'Int' });
      sc.Mutation.addFields({ field2: 'Int' });
      sc.Subscription.addFields({ field3: 'Int' });

      sc.addTypeDefs(`
        type Query {
          field4: Int
        }
        type Mutation {
          field5: Int
        }
        type Subscription {
          field6: Int
        }
      `);

      expect(sc.Query.getFieldNames()).toEqual(['field1', 'field4']);
      expect(sc.Mutation.getFieldNames()).toEqual(['field2', 'field5']);
      expect(sc.Subscription.getFieldNames()).toEqual(['field3', 'field6']);
    });
  });

  describe('addResolveMethods', () => {
    it('should add resolve methods to fields in graphql-tools way', async () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        schema {
          query: Query
        }

        type Post {
          id: Int!
          title: String
          votes: Int
        }

        type Query {
          posts: [Post]
        }
      `);

      sc.addResolveMethods({
        Query: {
          posts: () => [{ id: 1, title: 'Post title' }],
        },
        Post: {
          votes: () => 10,
        },
      });

      const schema = sc.buildSchema();

      expect(await graphql(schema, '{ posts { id title votes } }')).toEqual({
        data: { posts: [{ id: 1, title: 'Post title', votes: 10 }] },
      });
    });

    it('should add scalar types', () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        scalar Date
      `);

      sc.addResolveMethods({
        Date: new GraphQLScalarType({
          name: 'Date',
          serialize(value: any) {
            return new Date(value).toISOString().slice(0, 10);
          },
        }),
      });
      expect(sc.get('Date')).toBeInstanceOf(GraphQLScalarType);
      expect(Array.from(sc.types.keys())).toEqual(['Date']);
    });

    it('should add scalar types as configs', () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        scalar Date
      `);

      sc.addResolveMethods({
        Date: ({
          name: 'Date',
          serialize(value: any) {
            return new Date(value).toISOString().slice(0, 10);
          },
        }: any),
      });
      expect(sc.get('Date')).toBeInstanceOf(GraphQLScalarType);
      expect(Array.from(sc.types.keys())).toEqual(['Date']);
    });
  });

  describe('createTC helper methods', () => {
    it('createObjectTC()', () => {
      const sc = new SchemaComposer();
      const tc = sc.createObjectTC(`type A { f: Int }`);
      expect(tc).toBeInstanceOf(ObjectTypeComposer);
      expect(tc.hasField('f')).toBeTruthy();

      const tc2 = sc.createObjectTC(`type B { f: Int }`);
      expect(tc2).toBeInstanceOf(ObjectTypeComposer);
      expect(tc2.hasField('f')).toBeTruthy();
    });

    it('createInputTC()', () => {
      const sc = new SchemaComposer();
      const tc = sc.createInputTC(`input A { f: Int }`);
      expect(tc).toBeInstanceOf(InputTypeComposer);
      expect(tc.hasField('f')).toBeTruthy();
    });

    it('createScalarTC()', () => {
      const sc = new SchemaComposer();
      const tc = sc.createScalarTC(`scalar ABC`);
      expect(tc).toBeInstanceOf(ScalarTypeComposer);
      expect(tc.getTypeName()).toBe('ABC');
    });

    it('createEnumTC()', () => {
      const sc = new SchemaComposer();
      const tc = sc.createEnumTC(`enum A { AAA BBB }`);
      expect(tc).toBeInstanceOf(EnumTypeComposer);
      expect(tc.hasField('AAA')).toBeTruthy();
    });

    it('createInterfaceTC()', () => {
      const sc = new SchemaComposer();
      const tc = sc.createInterfaceTC(`interface A { f: Int }`);
      expect(tc).toBeInstanceOf(InterfaceTypeComposer);
      expect(tc.hasField('f')).toBeTruthy();
    });

    it('createUnionTC()', () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        type AA { a: Int }
        type BB { b: Int }
      `);
      const tc = sc.createUnionTC(`union A = AA | BB`);
      expect(tc).toBeInstanceOf(UnionTypeComposer);
      expect(tc.hasType('AA')).toBeTruthy();
    });
  });

  describe('works with directives', () => {
    const d1 = new GraphQLDirective({
      name: 'myDirective1',
      locations: [DirectiveLocation.INPUT_FIELD_DEFINITION],
      args: {
        value: {
          type: GraphQLString,
        },
      },
    });

    const d2 = new GraphQLDirective({
      name: 'myDirective2',
      locations: [DirectiveLocation.INPUT_FIELD_DEFINITION],
      args: {
        value: {
          type: GraphQLString,
        },
      },
    });

    function removeDefaultDirectives(sc) {
      sc.removeDirective(GraphQLSkipDirective);
      sc.removeDirective(GraphQLIncludeDirective);
      sc.removeDirective(GraphQLDeprecatedDirective);
    }

    it('has default directives', () => {
      const sc = new SchemaComposer();
      expect(sc.hasDirective('@skip')).toBe(true);
      expect(sc.hasDirective('@include')).toBe(true);
      expect(sc.hasDirective('@deprecated')).toBe(true);
      expect(sc.getDirectives()).toHaveLength(3);
    });

    it('addDirective()', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      sc.addDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.addDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.addDirective(d2);
      expect(sc.getDirectives()).toHaveLength(2);
    });

    it('removeDirective()', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      sc.addDirective(d1);
      sc.addDirective(d2);
      expect(sc.getDirectives()).toHaveLength(2);
      sc.removeDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.removeDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.removeDirective(d2);
      expect(sc.getDirectives()).toHaveLength(0);
    });

    it('addTypeDefs() should add directives', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      expect(sc.getDirectives()).toHaveLength(0);
      sc.addTypeDefs(`
        directive @customDirective(level: Int!) on FIELD
      `);
      expect(sc.getDirectives()).toHaveLength(1);
      expect(sc.getDirectives()[0]).toBeInstanceOf(GraphQLDirective);
    });

    it('clear() should clear directives and restore defaults', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      sc.addDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.clear();
      expect(sc.hasDirective('@skip')).toBe(true);
      expect(sc.hasDirective('@include')).toBe(true);
      expect(sc.hasDirective('@deprecated')).toBe(true);
      expect(sc.getDirectives()).toHaveLength(3);
    });

    it('hasDirective()', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      sc.addDirective(d1);
      expect(sc.hasDirective(d1)).toBeTruthy();
      expect(sc.hasDirective('@myDirective1')).toBeTruthy();
      expect(sc.hasDirective('myDirective1')).toBeTruthy();

      expect(sc.hasDirective(d2)).toBeFalsy();
      expect(sc.hasDirective('myDirective2')).toBeFalsy();
    });
  });
});
