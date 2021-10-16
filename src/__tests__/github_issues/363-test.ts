import { schemaComposer } from '../..';
import { parse, GraphQLInputObjectType } from 'graphql';

describe('github issue 363', () => {
  it('TypeMapper.makeSchemaDef should create default values from ast', () => {
    const documentNode = parse(`
      input AnInput {
        nonNullable:String!
        nullable:String
        defaultValue:String = "Default input value"
      }
    `);
    const inputDefinition = documentNode.definitions[0];
    schemaComposer.typeMapper.makeSchemaDef(inputDefinition);
    const schema = schemaComposer.buildSchema({ keepUnusedTypes: true });
    const inputType = schema.getType('AnInput') as GraphQLInputObjectType;
    const fields = inputType.getFields();
    const defaultValueField = fields.defaultValue;
    expect(defaultValueField.defaultValue).toBe('Default input value');
  });
});
