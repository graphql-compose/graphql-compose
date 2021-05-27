// TODO: enable after migration to TypeScript

import { printType } from 'graphql';
import { schemaComposer, dedent, ObjectTypeComposer } from '../..';

describe.skip('github issue #317: Directive @deprecated for arguments in SDL is ignored ', () => {
  it('should build schema successfully', async () => {
    const typeComposer = schemaComposer.typeMapper.convertSDLTypeDefinition(`
      type Foo {
        foo(
          arg: String @deprecated(reason: "Tired")
        ): String
      }
    `) as ObjectTypeComposer;

    const type = typeComposer.getType();

    expect(typeComposer.toSDL()).toEqual(dedent`
      type Foo {
        foo(
          arg: String @deprecated(reason: "Tired")
        ): String
      }
    `);

    expect(printType(type)).toEqual(dedent`
      type Foo {
        foo(
          arg: String @deprecated(reason: "Tired")
        ): String
      }
    `);
  });
});
