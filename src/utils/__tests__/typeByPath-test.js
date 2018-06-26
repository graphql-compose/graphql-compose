/* @flow strict */

import { GraphQLString, GraphQLInt, GraphQLFloat } from '../../graphql';
import { TypeComposer, InputTypeComposer, Resolver } from '../..';

describe('typeByPath', () => {
  const lonLatTC = TypeComposer.create('type LonLat { lon: Float, lat: Float }');
  const spotITC = InputTypeComposer.create(
    'input SpotInput { lon: Float, lat: Float, distance: Float }'
  );
  spotITC.setField('subSpot', spotITC);
  const tc = TypeComposer.create({
    name: 'Place',
    fields: {
      title: 'String!',
      lonLat: lonLatTC,
      image: {
        type: 'String',
        args: {
          size: 'Int',
        },
      },
      points: '[LonLat]',
    },
  });
  const rsv = new Resolver({
    name: 'findMany',
    args: {
      limit: 'Int',
      search: 'String',
      spot: spotITC,
    },
    type: tc,
  });
  tc.setResolver('findSpots', rsv);

  describe('for TypeComposer', () => {
    it('should return field type', () => {
      expect(tc.get('title')).toBe(GraphQLString);
    });

    it('should return TypeCompose for complex type', () => {
      expect(tc.get('lonLat')).toBeInstanceOf(TypeComposer);
      expect(tc.get('lonLat').getTypeName()).toBe('LonLat');
    });

    it('should return sub field type', () => {
      expect(tc.get('lonLat.lon')).toBe(GraphQLFloat);
      expect(tc.get('lonLat.lat')).toBe(GraphQLFloat);
    });

    it('should return type of field arg', () => {
      expect(tc.get('image.@size')).toBe(GraphQLInt);
    });

    it('should return resolver', () => {
      expect(tc.get('$findSpots')).toBeInstanceOf(Resolver);
    });

    it('should return resolver args', () => {
      expect(tc.get('$findSpots.@limit')).toBe(GraphQLInt);
      expect(tc.get('$findSpots.@spot')).toBeInstanceOf(InputTypeComposer);
      expect(tc.get('$findSpots.@spot').getType()).toBe(spotITC.getType());
    });

    it('should return type of resolver outputType fields', () => {
      expect(tc.get('$findSpots.title')).toBe(GraphQLString);
      expect(tc.get('$findSpots.image.@size')).toBe(GraphQLInt);
    });

    it('should return same GraphQL type instances', () => {
      expect(tc.get('lonLat').getType()).toBeTruthy();
      // via TypeComposer
      expect(tc.get('lonLat').getType()).toBe(tc.get('lonLat').getType());
      // scalar type
      expect(tc.get('lonLat.lat')).toBe(tc.get('lonLat.lat'));
    });

    it('should return same GraphQL type instances via resolver', () => {
      expect(tc.get('$findSpots.lonLat').getType()).toBeTruthy();
      expect(tc.get('$findSpots.lonLat').getType()).toBe(tc.get('$findSpots.lonLat').getType());

      // for wrapped type eg Array
      expect(tc.get('$findSpots.points').getType()).toBeTruthy();
      expect(tc.get('$findSpots.points').getType()).toBe(tc.get('$findSpots.points').getType());
    });
  });

  describe('for InputTypeComposer', () => {
    it('should return field type', () => {
      expect(spotITC.get('lon')).toBe(GraphQLFloat);
      expect(spotITC.get('distance')).toBe(GraphQLFloat);
    });

    it('should return sub field type', () => {
      expect(spotITC.get('subSpot.lon')).toBe(GraphQLFloat);
      expect(spotITC.get('subSpot.distance')).toBe(GraphQLFloat);
    });
  });

  describe('for Resolver', () => {
    it('should return args', () => {
      expect(rsv.get('@limit')).toBe(GraphQLInt);
      expect(rsv.get('@spot')).toBeInstanceOf(InputTypeComposer);
      expect(rsv.get('@spot').getType()).toBe(spotITC.getType());
    });

    it('should return type of outputType fields', () => {
      expect(rsv.get('title')).toBe(GraphQLString);
      expect(rsv.get('image.@size')).toBe(GraphQLInt);
    });

    it('should return same GraphQL type instances', () => {
      expect(rsv.get('@spot').getType()).toBeTruthy();
      // via InputTypeComposer
      expect(rsv.get('@spot').getType()).toBe(rsv.get('@spot').getType());
      // scalar type
      expect(rsv.get('@spot.lat')).toBe(rsv.get('@spot.lat'));
    });
  });
});
