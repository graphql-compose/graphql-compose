import { expect } from 'chai';
import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
} from 'graphql';
import TypeComposer from '../typeComposer';
import InputTypeComposer from '../inputTypeComposer';
import Resolver from '../resolver';

describe('typeByPath', () => {
  const lonLatTC = TypeComposer.create(
    'type LonLat { lon: Float, lat: Float }'
  );
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
    outputType: tc,
  });
  tc.setResolver('findSpots', rsv);

  describe('for TypeComposer', () => {
    it('should return field type', () => {
      expect(tc.get('title')).equal(GraphQLString);
    });

    it('should return TypeCompose for complex type', () => {
      expect(tc.get('lonLat')).instanceof(TypeComposer);
      expect(tc.get('lonLat').getTypeName()).equal('LonLat');
    });

    it('should return sub field type', () => {
      expect(tc.get('lonLat.lon')).equal(GraphQLFloat);
      expect(tc.get('lonLat.lat')).equal(GraphQLFloat);
    });

    it('should return type of field arg', () => {
      expect(tc.get('image.@size')).equal(GraphQLInt);
    });

    it('should return resolver', () => {
      expect(tc.get('$findSpots')).instanceof(Resolver);
    });

    it('should return resolver args', () => {
      expect(tc.get('$findSpots.@limit')).equal(GraphQLInt);
      expect(tc.get('$findSpots.@spot')).instanceof(InputTypeComposer);
      expect(tc.get('$findSpots.@spot').getType())
        .equal(spotITC.getType());
    });

    it('should return resolver outputType fields', () => {
      expect(tc.get('$findSpots.title')).equal(GraphQLString);
      expect(tc.get('$findSpots.image.@size')).equal(GraphQLInt);
    });

    it('should return same GraphQL type instances', () => {
      expect(tc.get('lonLat').getType()).to.be.ok;
      // via TypeComposer
      expect(tc.get('lonLat').getType()).equal(tc.get('lonLat').getType());
      // scalar type
      expect(tc.get('lonLat.lat')).equal(tc.get('lonLat.lat'));
    });

    it('should return same GraphQL type instances via resolver', () => {
      expect(tc.get('$findSpots.lonLat').getType()).to.be.ok;
      expect(tc.get('$findSpots.lonLat').getType())
        .equal(tc.get('$findSpots.lonLat').getType());

      // for wrapped type eg Array
      expect(tc.get('$findSpots.points').getType()).to.be.ok;
      expect(tc.get('$findSpots.points').getType())
        .equal(tc.get('$findSpots.points').getType());
    });
  });

  describe('for InputTypeComposer', () => {
    it('should return field type', () => {
      expect(spotITC.get('lon')).equal(GraphQLFloat);
      expect(spotITC.get('distance')).equal(GraphQLFloat);
    });

    it('should return sub field type', () => {
      expect(spotITC.get('subSpot.lon')).equal(GraphQLFloat);
      expect(spotITC.get('subSpot.distance')).equal(GraphQLFloat);
    });
  });

  describe('for Resolver', () => {
    it('should return args', () => {
      expect(rsv.get('@limit')).equal(GraphQLInt);
      expect(rsv.get('@spot')).instanceof(InputTypeComposer);
      expect(rsv.get('@spot').getType())
        .equal(spotITC.getType());
    });

    it('should return outputType fields types', () => {
      expect(rsv.get('title')).equal(GraphQLString);
      expect(rsv.get('image.@size')).equal(GraphQLInt);
    });

    it('should return same GraphQL type instances', () => {
      expect(rsv.get('@spot').getType()).to.be.ok;
      // via InputTypeComposer
      expect(rsv.get('@spot').getType()).equal(rsv.get('@spot').getType());
      // scalar type
      expect(rsv.get('@spot.lat')).equal(rsv.get('@spot.lat'));
    });
  });
});
