/* @flow strict */

import { GraphQLString, GraphQLObjectType, GraphQLInputObjectType } from '../../graphql';
import { TypeComposer, InputTypeComposer, schemaComposer } from '../../';
import {
  resolveOutputConfigMapAsThunk,
  resolveInputConfigMapAsThunk,
  resolveArgConfigMapAsThunk,
} from '../configAsThunk';

describe('configAsThunk', () => {
  describe('resolveOutputConfigMapAsThunk()', () => {
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
      const unwrapped: any = resolveOutputConfigMapAsThunk(schemaComposer, fieldMap);
      expect(unwrapped.f0.type).toBe(GraphQLString);
      expect(unwrapped.f0.description).toBe('Field0');

      expect(unwrapped.f1.type).toBe(GraphQLString);
      expect(unwrapped.f1.description).toBe('Field1');

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
      const unwrapped: any = resolveOutputConfigMapAsThunk(schemaComposer, fieldMap);

      expect(unwrapped.f1.type).toBe(GraphQLString);

      expect(unwrapped.f2.type).toBe(GraphQLString);

      expect(unwrapped.f3.type).toBeInstanceOf(GraphQLObjectType);
      expect(unwrapped.f3.type.name).toBe('MyType');
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f4.type).toBe(GraphQLString);

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
      const unwrapped: any = resolveOutputConfigMapAsThunk(schemaComposer, fieldMap);

      expect(unwrapped.f3.type).toBe(GraphQLString);
      expect(unwrapped.f4.type).toBe(GraphQLString);
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
      const unwrapped = resolveOutputConfigMapAsThunk(schemaComposer, fieldMap);
      const { args }: any = unwrapped.f6;
      expect(args.a1.type).toBe(GraphQLString);
      expect(args.a2.type).toBe(GraphQLString);
      expect(args.a2.description).toBe('Desc');
      expect(args.a3.type).toBe(GraphQLString);
    });
  });

  describe('resolveInputConfigMapAsThunk()', () => {
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
      const unwrapped: any = resolveInputConfigMapAsThunk(schemaComposer, fieldMap);
      expect(unwrapped.f0.type).toBe(GraphQLString);
      expect(unwrapped.f0.description).toBe('Field0');

      expect(unwrapped.f1.type).toBe(GraphQLString);
      expect(unwrapped.f1.description).toBe('Field1');

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

      const unwrapped: any = resolveInputConfigMapAsThunk(schemaComposer, fieldMap);

      expect(unwrapped.f1.type).toBe(GraphQLString);

      expect(unwrapped.f2.type).toBe(GraphQLString);

      expect(unwrapped.f3.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(unwrapped.f3.type.name).toBe('MyType');
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f4.type).toBe(GraphQLString);

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
      const unwrapped = resolveInputConfigMapAsThunk(schemaComposer, fieldMap);

      expect(unwrapped.f3.type).toBe(GraphQLString);
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f4.type).toBe(GraphQLString);
      expect(unwrapped.f4.description).toBe('Field4');
    });
  });

  describe('resolveArgConfigMapAsThunk()', () => {
    it('should unwrap fields from functions', () => {
      const argMap = {
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
      const unwrapped: any = resolveArgConfigMapAsThunk(schemaComposer, argMap);
      expect(unwrapped.f0.type).toBe(GraphQLString);
      expect(unwrapped.f0.description).toBe('Field0');

      expect(unwrapped.f1.type).toBe(GraphQLString);
      expect(unwrapped.f1.description).toBe('Field1');

      expect(unwrapped.f3.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(unwrapped.f3.type.name).toBe('MyType');
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f5.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(unwrapped.f5.type.name).toBe('LonLat');
      expect(unwrapped.f5.description).toBe('Field5');
    });

    it('should unwrap types from functions', () => {
      const argMap = {
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

      const unwrapped: any = resolveArgConfigMapAsThunk(schemaComposer, argMap);

      expect(unwrapped.f1.type).toBe(GraphQLString);

      expect(unwrapped.f2.type).toBe(GraphQLString);

      expect(unwrapped.f3.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(unwrapped.f3.type.name).toBe('MyType');
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f4.type).toBe(GraphQLString);

      expect(unwrapped.f5.type).toBeInstanceOf(GraphQLInputObjectType);
      expect(unwrapped.f5.type.name).toBe('LonLat');
      expect(unwrapped.f5.description).toBe('Field5');
    });

    it('should unwrap fields from functions and type from function', () => {
      const argMap = {
        f3: () => ({
          type: () => GraphQLString,
          description: 'Field3',
        }),
        f4: () => ({
          type: () => 'String',
          description: 'Field4',
        }),
      };
      const unwrapped = resolveArgConfigMapAsThunk(schemaComposer, argMap);

      expect(unwrapped.f3.type).toBe(GraphQLString);
      expect(unwrapped.f3.description).toBe('Field3');

      expect(unwrapped.f4.type).toBe(GraphQLString);
      expect(unwrapped.f4.description).toBe('Field4');
    });
  });
});
