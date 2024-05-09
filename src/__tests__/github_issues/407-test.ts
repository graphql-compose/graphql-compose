import { print } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { schemaComposer } from '../..';

describe('github issue #407', () => {
  it('defaultValue can take an object with JSON type', () => {
    const inputTC = schemaComposer.createInputTC({
      name: 'InputWithJSONAndDefaultValue',
      fields: {
        json: {
          type: GraphQLJSON,
          defaultValue: {},
        },
      },
    });
    const inputType = inputTC.getType();
    expect(inputType.astNode).toMatchObject({
      kind: 'InputObjectTypeDefinition',
      name: { kind: 'Name', value: 'InputWithJSONAndDefaultValue' },
      fields: [
        {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: 'json' },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JSON' },
          },
          defaultValue: {
            kind: 'ObjectValue',
            fields: [],
          },
        },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sdl = print(inputType.astNode!);
    expect(sdl).toBe(
      /* GraphQL */ `
input InputWithJSONAndDefaultValue {
  json: JSON = {}
}
    `.trim()
    );
  });
});
