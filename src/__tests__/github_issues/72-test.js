/* @flow strict */

import { TypeComposer } from '../../';

describe('github issue #72', () => {
  it('extendField after addRelation', () => {
    const MyTypeTC = TypeComposer.create(`type MyType { name: String }`);
    const OtherTypeTC = TypeComposer.create(`type OtherType { name: String }`);
    OtherTypeTC.addResolver({
      name: 'findOne',
      type: OtherTypeTC,
      resolve: () => null,
    });

    MyTypeTC.addRelation('field1', {
      resolver: () => OtherTypeTC.getResolver('findOne'),
      description: 'Relation with OtherType',
    });

    expect(typeof MyTypeTC._fields.field1).toBe('function');

    expect(() => {
      MyTypeTC.extendField('field1', {
        description: 'Extended desc',
      });
    }).toThrowError('Cannot extend field');
  });
});
