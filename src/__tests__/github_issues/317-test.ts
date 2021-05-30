import { printType } from 'graphql';
import { schemaComposer, dedent, ObjectTypeComposer } from '../..';

describe('github issue #317: Directive @deprecated for arguments in SDL is ignored', () => {
  it('should print correct SDL 1', async () => {
    const typeComposer = schemaComposer.typeMapper.convertSDLTypeDefinition(`
      type Foo {
        foo(
          arg: String @deprecated(reason: "Tired")
        ): String
      }
    `) as ObjectTypeComposer;

    expect(typeComposer.toSDL()).toEqual(dedent`
      type Foo {
        foo(arg: String @deprecated(reason: "Tired")): String
      }
    `);

    const type = typeComposer.getType();

    expect(printType(type)).toEqual(dedent`
      type Foo {
        foo(arg: String @deprecated(reason: "Tired")): String
      }
    `);
  });

  it('should print correct SDL 2', async () => {
    const typeComposer = schemaComposer.createObjectTC({
      name: 'Foo2',
      fields: {
        foo: {
          type: 'String',
          args: {
            arg: {
              type: 'String',
              deprecationReason: 'ArgTired',
            },
          },
          deprecationReason: 'FieldTired',
        },
      },
    });

    expect(typeComposer.toSDL()).toEqual(dedent`
      type Foo2 {
        foo(arg: String @deprecated(reason: "ArgTired")): String @deprecated(reason: "FieldTired")
      }
    `);

    const type = typeComposer.getType();

    expect(printType(type)).toEqual(dedent`
      type Foo2 {
        foo(arg: String @deprecated(reason: "ArgTired")): String @deprecated(reason: "FieldTired")
      }
    `);
  });

  it('should print correct SDL 3', async () => {
    const typeComposer = schemaComposer.createInputTC({
      name: 'Foo3',
      fields: {
        foo: {
          type: 'String',
          deprecationReason: 'FieldTired',
        },
      },
    });

    expect(typeComposer.toSDL()).toEqual(dedent`
      input Foo3 {
        foo: String @deprecated(reason: "FieldTired")
      }
    `);

    const type = typeComposer.getType();

    expect(printType(type)).toEqual(dedent`
      input Foo3 {
        foo: String @deprecated(reason: "FieldTired")
      }
    `);
  });
});
