import { schemaComposer} from '../..';
import {parse, GraphQLInputObjectType} from 'graphql'

describe('github issue 363', () => {
  it('Typemapper.makeSchemaDef should create default values from ast', () => {
    const documentNode = parse(`
    input AnInput {
        nonnullable:String!
        nullable:String
        defaultvalue:String = "Default input value"
    }
    `) 
    var inputDefinition = documentNode.definitions[0];
    schemaComposer.typeMapper.makeSchemaDef(inputDefinition);
    const schema = schemaComposer.buildSchema({keepUnusedTypes:true});
    var inputType = schema.getType("AnInput") as GraphQLInputObjectType;
    var fields = inputType.getFields();
    var defaultValueField = fields.defaultvalue;
    expect(defaultValueField.defaultValue).toBe("Default input value");

  });
});