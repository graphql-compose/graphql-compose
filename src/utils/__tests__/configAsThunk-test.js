/* @flow */

import { GraphQLString, GraphQLObjectType, GraphQLInputObjectType } from '../../graphql';
import TypeComposer from '../../typeComposer';
import InputTypeComposer from '../../inputTypeComposer';
import {
  resolveOutputConfigsAsThunk,
  resolveInputConfigsAsThunk,
  keepConfigsAsThunk,
} from '../configAsThunk';

describe('typeAsThunk', () => {
  describe('resolveOutputConfigsAsThunk()', () => {
    it('should unwrap fields from functions', () => {
      const fieldMap = {
        f0: () => ({
          type: GraphQLString,
          description: 'Field0',
        }),
        f1: () => ({
          type: 'String',
          description: 'Field1',
        }),
        f3: {
          type: new GraphQLObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
          description: 'Field3',
        },
        f5: () => ({
          type: TypeComposer.create('type LonLat { lon: Float, lat: Float}'),
          description: 'Field5',
        }),
      };
      const unwrapped = resolveOutputConfigsAsThunk(fieldMap);
      expect(unwrapped.f0.type).toBe(GraphQLString);
      expect(unwrapped.f0.description).toBe('Field0');
      expect(unwrapped.f0._fieldAsThunk).toBeTruthy();
      expect(unwrapped.f0._fieldAsThunk()).toEqual({
        type: GraphQLString,
        description: 'Field0',
      });

      expect(unwrapped.f1.type).toBe(GraphQLString);
      expect(unwrapped.f1.description).toBe('Field1');
      expect(unwrapped.f1._fieldAsThunk).toBeTruthy();
      expect(unwrapped.f1._fieldAsThunk()).toEqual({
        type: 'String',
        description: 'Field1',
      });

      expect(unwrapped.f3.type).toBeInstanceOf(GraphQLObjectType);
      expect(unwrapped.f3.type.name).toBe('MyType');
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f5.type).toBeInstanceOf(GraphQLObjectType);
      expect(unwrapped.f5.type.name).toBe('LonLat');
      expect(unwrapped.f5.description).toBe('Field5');
    });

    it('should unwrap types from functions', () => {
      const fieldMap = {
        f1: {
          type: GraphQLString,
        },
        f2: {
          type: () => GraphQLString,
          description: 'Field2',
        },
        f3: {
          type: new GraphQLObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
          description: 'Field3',
        },
        f4: {
          type: () => 'String',
        },
        f5: {
          type: () => TypeComposer.create('type LonLat { lon: Float, lat: Float}'),
          description: 'Field5',
        },
      };
      const unwrapped: any = resolveOutputConfigsAsThunk(fieldMap);

      expect(unwrapped.f1.type).toBe(GraphQLString);

      expect(unwrapped.f2.type).toBe(GraphQLString);
      expect(unwrapped.f2._typeAsThunk).toBeTruthy();
      expect(unwrapped.f2._typeAsThunk()).toBe(GraphQLString);

      expect(unwrapped.f3.type).toBeInstanceOf(GraphQLObjectType);
      expect(unwrapped.f3.type.name).toBe('MyType');
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f4.type).toBe(GraphQLString);
      expect(unwrapped.f4._typeAsThunk).toBeTruthy();
      expect(unwrapped.f4._typeAsThunk()).toBe('String');

      expect(unwrapped.f5.type).toBeInstanceOf(GraphQLObjectType);
      expect(unwrapped.f5.type.name).toBe('LonLat');
      expect(unwrapped.f5.description).toBe('Field5');
    });

    it('should unwrap fields from functions and type from function', () => {
      const fieldMap = {
        f3: () => ({
          type: () => GraphQLString,
          description: 'Field3',
        }),
        f4: () => ({
          type: () => 'String',
          description: 'Field4',
        }),
      };
      const unwrapped = resolveOutputConfigsAsThunk(fieldMap);

      expect(unwrapped.f3.type).toBe(GraphQLString);
      expect(unwrapped.f3._fieldAsThunk).toBeTruthy();
      expect(Object.keys(unwrapped.f3._fieldAsThunk())).toEqual(
        expect.arrayContaining(['type', 'description'])
      );
      expect(unwrapped.f3._typeAsThunk).toBeTruthy();
      expect(unwrapped.f3._typeAsThunk()).toBe(GraphQLString);

      expect(unwrapped.f4.type).toBe(GraphQLString);
      expect(unwrapped.f4._fieldAsThunk).toBeTruthy();
      expect(Object.keys(unwrapped.f4._fieldAsThunk())).toEqual(
        expect.arrayContaining(['type', 'description'])
      );
      expect(unwrapped.f4._typeAsThunk).toBeTruthy();
      expect(unwrapped.f4._typeAsThunk()).toBe('String');
    });

    it('should works with arg as function', () => {
      const fieldMap = {
        f6: {
          type: GraphQLString,
          args: {
            a1: () => GraphQLString,
            a2: () => ({ type: GraphQLString, description: 'Desc' }),
            a3: { type: () => GraphQLString },
          },
        },
      };
      const unwrapped = resolveOutputConfigsAsThunk(fieldMap);
      const { args } = unwrapped.f6;
      expect(args.a1.type).toBe(GraphQLString);
      expect(args.a2.type).toBe(GraphQLString);
      expect(args.a2.description).toBe('Desc');
      expect(args.a3.type).toBe(GraphQLString);
    });

    it('should pass null, undefined', () => {
      expect(resolveOutputConfigsAsThunk((null: any))).toBe(null);
      expect(resolveOutputConfigsAsThunk((undefined: any))).toBe(undefined);
    });
  });

  describe('resolveInputConfigsAsThunk()', () => {
    it('should unwrap fields from functions', () => {
      const fieldMap = {
        f0: () => ({
          type: GraphQLString,
          description: 'Field0',
        }),
        f1: () => ({
          type: 'String',
          description: 'Field1',
        }),
        f3: {
          type: new GraphQLInputObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
          description: 'Field3',
        },
        f5: () => ({
          type: InputTypeComposer.create('input LonLat { lon: Float, lat: Float}'),
          description: 'Field5',
        }),
      };
      const unwrapped = resolveInputConfigsAsThunk(fieldMap);
      expect(unwrapped.f0.type).toBe(GraphQLString);
      expect(unwrapped.f0.description).toBe('Field0');
      expect(unwrapped.f0._fieldAsThunk).toBeTruthy();
      expect(unwrapped.f0._fieldAsThunk()).toEqual({
        type: GraphQLString,
        description: 'Field0',
      });

      expect(unwrapped.f1.type).toBe(GraphQLString);
      expect(unwrapped.f1.description).toBe('Field1');
      expect(unwrapped.f1._fieldAsThunk).toBeTruthy();
      expect(unwrapped.f1._fieldAsThunk()).toEqual({
        type: 'String',
        description: 'Field1',
      });

      expect(unwrapped.f3.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(unwrapped.f3.type.name).toBe('MyType');
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f5.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(unwrapped.f5.type.name).toBe('LonLat');
      expect(unwrapped.f5.description).toBe('Field5');
    });

    it('should unwrap types from functions', () => {
      const fieldMap = {
        f1: {
          type: GraphQLString,
        },
        f2: {
          type: () => GraphQLString,
          description: 'Field2',
        },
        f3: {
          type: new GraphQLInputObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
          description: 'Field3',
        },
        f4: {
          type: () => 'String',
        },
        f5: {
          type: () => InputTypeComposer.create('input LonLat { lon: Float, lat: Float}'),
          description: 'Field5',
        },
      };

      const unwrapped: any = resolveInputConfigsAsThunk(fieldMap);

      expect(unwrapped.f1.type).toBe(GraphQLString);

      expect(unwrapped.f2.type).toBe(GraphQLString);
      expect(unwrapped.f2._typeAsThunk).toBeTruthy();
      expect(unwrapped.f2._typeAsThunk()).toBe(GraphQLString);

      expect(unwrapped.f3.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(unwrapped.f3.type.name).toBe('MyType');
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f4.type).toBe(GraphQLString);
      expect(unwrapped.f4._typeAsThunk).toBeTruthy();
      expect(unwrapped.f4._typeAsThunk()).toBe('String');

      expect(unwrapped.f5.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(unwrapped.f5.type.name).toBe('LonLat');
      expect(unwrapped.f5.description).toBe('Field5');
    });

    it('should unwrap fields from functions and type from function', () => {
      const fieldMap = {
        f3: () => ({
          type: () => GraphQLString,
          description: 'Field3',
        }),
        f4: () => ({
          type: () => 'String',
          description: 'Field4',
        }),
      };
      const unwrapped = resolveInputConfigsAsThunk(fieldMap);

      expect(unwrapped.f3.type).toBe(GraphQLString);
      expect(unwrapped.f3.description).toBe('Field3');
      expect(unwrapped.f3._fieldAsThunk).toBeTruthy();
      expect(Object.keys(unwrapped.f3._fieldAsThunk())).toEqual(
        expect.arrayContaining(['type', 'description'])
      );
      expect(unwrapped.f3._typeAsThunk).toBeTruthy();
      expect(unwrapped.f3._typeAsThunk()).toBe(GraphQLString);

      expect(unwrapped.f4.type).toBe(GraphQLString);
      expect(unwrapped.f4.description).toBe('Field4');
      expect(unwrapped.f4._fieldAsThunk).toBeTruthy();
      expect(Object.keys(unwrapped.f4._fieldAsThunk())).toEqual(
        expect.arrayContaining(['type', 'description'])
      );
      expect(unwrapped.f4._typeAsThunk).toBeTruthy();
      expect(unwrapped.f4._typeAsThunk()).toBe('String');
    });

    it('should pass null, undefined', () => {
      expect(resolveInputConfigsAsThunk((null: any))).toBe(null);
      expect(resolveInputConfigsAsThunk((undefined: any))).toBe(undefined);
    });
  });

  describe('keepConfigsAsThunk()', () => {
    it('should set _typeAsThunk to type', () => {
      const unwrapped = {
        f1: {
          type: GraphQLString,
          args: {
            a1: {
              type: GraphQLString,
              _typeAsThunk: () => GraphQLString,
            },
          },
        },
        f2: {
          type: new GraphQLObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
        },
        f3: {
          type: GraphQLString,
          _typeAsThunk: () => GraphQLString,
        },
        f4: {
          type: GraphQLString,
          _fieldAsThunk: () => GraphQLString,
        },
        f5: {
          type: GraphQLString,
          _fieldAsThunk: () => ({ type: GraphQLString }),
        },
      };
      const wrapped: any = keepConfigsAsThunk(unwrapped);
      expect(wrapped.f1.type).toBe(GraphQLString);
      expect(wrapped.f1.args.a1.type()).toBe(GraphQLString);
      expect(wrapped.f2.type).toBeInstanceOf(GraphQLObjectType);
      expect(wrapped.f3.type).toBeTruthy();
      expect(wrapped.f3.type()).toBe(GraphQLString);
      expect(wrapped.f4()).toBe(GraphQLString);
      expect(wrapped.f5().type).toBe(GraphQLString);
    });

    it('should pass null, undefined', () => {
      expect(keepConfigsAsThunk((null: any))).toBe(null);
      expect(keepConfigsAsThunk((undefined: any))).toBe(undefined);
    });
  });
});
