import {
  EnumTypeComposer,
  InputTypeComposer,
  InterfaceTypeComposer,
  ScalarTypeComposer,
  TypeComposer,
  UnionTypeComposer,
  schemaComposer,
} from '..';

beforeEach(() => {
  schemaComposer.clear();
});

describe('Extensions', () => {
  describe('TypeComposer', () => {
    it('has type Extensions methods', () => {
      const typeComposer = TypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
      });
      testTypeExtensions(typeComposer);
    });

    it('has field Extensions methods', () => {
      const typeComposer = TypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
      });
      testFieldExtensions(typeComposer);
    });

    it('has type extension initializers', () => {
      const typeComposer = TypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
        extensions: { tags: ['generated'] },
      });
      expect(typeComposer.getExtensions()).toEqual({ tags: ['generated'] });
    });

    it('has field extension initializers', () => {
      const typeComposer = TypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: {
            type: 'String',
            extensions: {
              noFilter: true,
            },
          },
        },
      });
      expect(typeComposer.getFieldExtensions('name')).toEqual({
        noFilter: true,
      });
    });
  });

  describe('InputTypeComposer', () => {
    it('has type Extensions methods', () => {
      const typeComposer = InputTypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
      });
      testTypeExtensions(typeComposer);
    });

    it('has field Extensions methods', () => {
      const typeComposer = InputTypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
      });
      testFieldExtensions(typeComposer);
    });

    it('has type extension initializers', () => {
      const typeComposer = InputTypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
        extensions: { tags: ['generated'] },
      });
      expect(typeComposer.getExtensions()).toEqual({ tags: ['generated'] });
    });

    it('has field extension initializers', () => {
      const typeComposer = InputTypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: {
            type: 'String',
            extensions: {
              noFilter: true,
            },
          },
        },
      });
      expect(typeComposer.getFieldExtensions('name')).toEqual({
        noFilter: true,
      });
    });
  });

  describe('InterfaceTypeComposer', () => {
    it('has type Extensions methods', () => {
      const typeComposer = InterfaceTypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
      });
      testTypeExtensions(typeComposer);
    });

    it('has field Extensions methods', () => {
      const typeComposer = InterfaceTypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
      });
      testFieldExtensions(typeComposer);
    });

    it('has type extension initializers', () => {
      const typeComposer = InterfaceTypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
        extensions: { tags: ['generated'] },
      });
      expect(typeComposer.getExtensions()).toEqual({ tags: ['generated'] });
    });

    it('has field extension initializers', () => {
      const typeComposer = InterfaceTypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: {
            type: 'String',
            extensions: {
              noFilter: true,
            },
          },
        },
      });
      expect(typeComposer.getFieldExtensions('name')).toEqual({
        noFilter: true,
      });
    });
  });

  describe('EnumTypeComposer', () => {
    it('has type Extensions methods', () => {
      const typeComposer = EnumTypeComposer.create({
        name: 'Foo',
        values: {
          FOO: { value: 'FOO' },
          BAR: { value: 'BAR' },
        },
      });
      testTypeExtensions(typeComposer);
    });

    it('has type extension initializers', () => {
      const typeComposer = EnumTypeComposer.create({
        name: 'Foo',
        values: {
          FOO: { value: 'FOO' },
          BAR: { value: 'BAR' },
        },
        extensions: { tags: ['generated'] },
      });
      expect(typeComposer.getExtensions()).toEqual({ tags: ['generated'] });
    });
  });

  describe('UnionTypeComposer', () => {
    it('has type Extensions methods', () => {
      const foo = TypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
      });
      const typeComposer = UnionTypeComposer.create({
        name: 'FooUnion',
        types: [foo],
      });
      testTypeExtensions(typeComposer);
    });

    it('has type extension initializers', () => {
      const foo = TypeComposer.create({
        name: 'Foo',
        fields: {
          id: 'ID!',
          name: 'String',
        },
      });
      const typeComposer = UnionTypeComposer.create({
        name: 'FooUnion',
        types: [foo],
        extensions: { tags: ['generated'] },
      });
      expect(typeComposer.getExtensions()).toEqual({ tags: ['generated'] });
    });
  });

  describe('ScalarTypeComposer', () => {
    it('has type Extensions methods', () => {
      const typeComposer = ScalarTypeComposer.create({
        name: 'Foo',
        serialize() {},
      });
      testTypeExtensions(typeComposer);
    });

    it('has type extension initializers', () => {
      const typeComposer = ScalarTypeComposer.create({
        name: 'Foo',
        serialize() {},
        extensions: { tags: ['generated'] },
      });
      expect(typeComposer.getExtensions()).toEqual({ tags: ['generated'] });
    });
  });

  function testTypeExtensions(instance) {
    expect(instance.getExtensions()).toEqual({});
    instance.setExtensions({
      tags: ['generated'],
      source: 'inference',
    });
    expect(instance.getExtensions()).toEqual({
      tags: ['generated'],
      source: 'inference',
    });
    instance.extendExtensions({
      source: 'user',
      originalName: 'foo',
    });
    expect(instance.getExtensions()).toEqual({
      tags: ['generated'],
      source: 'user',
      originalName: 'foo',
    });
    expect(instance.getExtension('source')).toEqual('user');
    expect(instance.hasExtension('source')).toEqual(true);
    expect(instance.hasExtension('nonExistant')).toEqual(false);
    instance.setExtension('source', 'inference');
    expect(instance.getExtensions()).toEqual({
      tags: ['generated'],
      source: 'inference',
      originalName: 'foo',
    });
    expect(instance.getExtension('source')).toEqual('inference');
    instance.removeExtension('originalName');
    expect(instance.getExtensions()).toEqual({
      tags: ['generated'],
      source: 'inference',
    });
    instance.clearExtensions();
    expect(instance.getExtensions()).toEqual({});
    expect(instance.hasExtension('source')).toEqual(false);
    instance.setExtensions({
      tags: ['generated'],
      source: 'inference',
    });
    expect(instance.getExtensions()).toEqual({
      tags: ['generated'],
      source: 'inference',
    });
    instance.clearExtensions();
  }

  function testFieldExtensions(instance) {
    expect(instance.getFieldExtensions('id')).toEqual({});
    instance.setFieldExtensions('id', {
      tags: ['generated'],
      source: 'inference',
    });
    expect(instance.getFieldExtensions('id')).toEqual({
      tags: ['generated'],
      source: 'inference',
    });
    instance.extendFieldExtensions('id', {
      source: 'user',
      originalName: 'foo',
    });
    expect(instance.getFieldExtensions('id')).toEqual({
      tags: ['generated'],
      source: 'user',
      originalName: 'foo',
    });
    expect(instance.getFieldExtension('id', 'source')).toEqual('user');
    expect(instance.hasFieldExtension('id', 'source')).toEqual(true);
    expect(instance.hasFieldExtension('id', 'nonExistant')).toEqual(false);
    instance.setFieldExtension('id', 'source', 'inference');
    expect(instance.getFieldExtensions('id')).toEqual({
      tags: ['generated'],
      source: 'inference',
      originalName: 'foo',
    });
    expect(instance.getFieldExtension('id', 'source')).toEqual('inference');
    instance.removeFieldExtension('id', 'originalName');
    expect(instance.getFieldExtensions('id')).toEqual({
      tags: ['generated'],
      source: 'inference',
    });
    instance.clearFieldExtensions('id');
    expect(instance.getFieldExtensions('id')).toEqual({});
    expect(instance.hasFieldExtension('id', 'source')).toEqual(false);
    instance.setFieldExtensions('id', {
      tags: ['generated'],
      source: 'inference',
    });
    expect(instance.getFieldExtensions('id')).toEqual({
      tags: ['generated'],
      source: 'inference',
    });
    instance.clearFieldExtensions('id');
  }
});
