/**
 * For reference see https://github.com/graphql/graphql-js/blob/master/src/language/ast.js
 */

import type {
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  EnumTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  UnionTypeDefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  EnumValueDefinitionNode,
  DirectiveNode,
  StringValueNode,
  IntValueNode,
  FloatValueNode,
  BooleanValueNode,
  NullValueNode,
  ListValueNode,
  ObjectValueNode,
  ObjectFieldNode,
  ArgumentNode,
  NamedTypeNode,
  TypeNode,
  ValueNode,
  GraphQLInputType,
  NameNode,
} from '../graphql';
import { GraphQLDirective } from '../graphql';
import type { ObjectTypeComposer } from '../ObjectTypeComposer';
import type { InputTypeComposer } from '../InputTypeComposer';
import type { EnumTypeComposer } from '../EnumTypeComposer';
import type { InterfaceTypeComposer, InterfaceTypeComposerThunked } from '../InterfaceTypeComposer';
import type { ScalarTypeComposer } from '../ScalarTypeComposer';
import type { UnionTypeComposer } from '../UnionTypeComposer';
import type { SchemaComposer } from '../SchemaComposer';
import type { AnyTypeComposer } from './typeHelpers';
import type { Directive, DirectiveArgs } from './definitions';
import { ThunkComposer } from '../ThunkComposer';
import { NonNullComposer } from '../NonNullComposer';
import { ListComposer } from '../ListComposer';
import { inspect } from './misc';
import { Kind, astFromValue } from 'graphql';

/**
 * Get astNode for ObjectTypeComposer.
 */
export function getObjectTypeDefinitionNode(
  tc: ObjectTypeComposer<any, any>
): ObjectTypeDefinitionNode {
  return {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: getNameNode(tc.getTypeName()),
    description: getDescriptionNode(tc.getDescription()),
    directives: getDirectiveNodes(tc.getDirectives(), tc.schemaComposer),
    interfaces: getInterfaceNodes(tc.getInterfaces()),
    fields: getFieldDefinitionNodes(tc),
  };
}

/**
 * Get astNode for InputTypeComposer.
 */
export function getInputObjectTypeDefinitionNode(
  tc: InputTypeComposer<any>
): InputObjectTypeDefinitionNode {
  return {
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
    name: getNameNode(tc.getTypeName()),
    directives: getDirectiveNodes(tc.getDirectives(), tc.schemaComposer),
    description: getDescriptionNode(tc.getDescription()),
    fields: getInputValueDefinitionNodes(tc),
  };
}

/**
 * Get astNode for EnumTypeComposer.
 */
export function getEnumTypeDefinitionNode(tc: EnumTypeComposer<any>): EnumTypeDefinitionNode {
  return {
    kind: Kind.ENUM_TYPE_DEFINITION,
    name: getNameNode(tc.getTypeName()),
    description: getDescriptionNode(tc.getDescription()),
    directives: getDirectiveNodes(tc.getDirectives(), tc.schemaComposer),
    values: getEnumValueDefinitionNodes(tc) || [],
  };
}

/**
 * Get astNode for InterfaceTypeComposer.
 */
export function getInterfaceTypeDefinitionNode(
  tc: InterfaceTypeComposer<any, any>
): InterfaceTypeDefinitionNode {
  return {
    kind: Kind.INTERFACE_TYPE_DEFINITION,
    name: getNameNode(tc.getTypeName()),
    description: getDescriptionNode(tc.getDescription()),
    directives: getDirectiveNodes(tc.getDirectives(), tc.schemaComposer),
    fields: getFieldDefinitionNodes(tc),
  };
}

/**
 * Get astNode for ScalarTypeComposer.
 */
export function getScalarTypeDefinitionNode(tc: ScalarTypeComposer<any>): ScalarTypeDefinitionNode {
  return {
    kind: Kind.SCALAR_TYPE_DEFINITION,
    name: getNameNode(tc.getTypeName()),
    description: getDescriptionNode(tc.getDescription()),
    directives: getDirectiveNodes(tc.getDirectives(), tc.schemaComposer),
  };
}

/**
 * Get astNode for ScalarTypeComposer.
 */
export function getUnionTypeDefinitionNode(
  tc: UnionTypeComposer<any, any>
): UnionTypeDefinitionNode {
  return {
    kind: Kind.UNION_TYPE_DEFINITION,
    name: getNameNode(tc.getTypeName()),
    description: getDescriptionNode(tc.getDescription()),
    directives: getDirectiveNodes(tc.getDirectives(), tc.schemaComposer),
    types: tc.getTypeNames().map((value) => ({
      kind: Kind.NAMED_TYPE,
      name: getNameNode(value),
    })),
  };
}

export function getDescriptionNode(value?: string | null): StringValueNode | undefined {
  if (!value) return;
  return {
    kind: Kind.STRING,
    value,
  };
}

/**
 * Maybe this function should be replaced by build-in `astFromValue(value, type)` function from graphql-js
 */
function toValueNode(value: any): ValueNode {
  switch (typeof value) {
    case 'string':
      // Will be good to add support for enum!
      // if (argType instanceof GraphQLEnumType) {
      //   return { kind: Kind.ENUM, value };
      // }
      return { kind: Kind.STRING, value } as StringValueNode;
    case 'number':
      if (Number.isInteger(value))
        return { kind: Kind.INT, value: value.toString() } as IntValueNode;
      return { kind: Kind.FLOAT, value: value.toString() } as FloatValueNode;
    case 'boolean':
      return { kind: Kind.BOOLEAN, value } as BooleanValueNode;
    case 'object':
      if (value === null) {
        return { kind: Kind.NULL } as NullValueNode;
      } else if (Array.isArray(value)) {
        return {
          kind: Kind.LIST,
          values: value.map((v) => toValueNode(v)),
        } as ListValueNode;
      } else {
        return {
          kind: Kind.OBJECT,
          fields: Object.keys(value).map(
            (k) =>
              ({
                kind: Kind.OBJECT_FIELD,
                name: getNameNode(k),
                value: toValueNode(value[k]),
              }) as ObjectFieldNode
          ),
        } as ObjectValueNode;
      }
    default:
      // unsupported types
      // 'bigint' | 'symbol' | 'undefined' | 'function';
      // As a fallback return null, should be fixed in future
      // Maybe better to throw an error.
      console.log(`Cannot determine astNode in toValueNode() method: ${inspect(value)}`);
      return { kind: Kind.NULL };
  }
}

function getDirectiveArgumentNodes(
  data: DirectiveArgs,
  directive?: GraphQLDirective
): ReadonlyArray<ArgumentNode> | undefined {
  const keys = Object.keys(data);
  if (!keys.length) return;
  const args: Array<ArgumentNode> = [];
  keys.forEach((k) => {
    let argumentType: GraphQLInputType | undefined;
    if (directive) {
      argumentType = directive.args.find((d) => d.name === k)?.type;
    }
    const argNode = {
      kind: Kind.ARGUMENT,
      name: getNameNode(k),
      value: argumentType
        ? // `astFromValue` supports EnumString
          astFromValue(data[k], argumentType) || { kind: Kind.NULL }
        : // `toValueNode` is fallback which supports just primitive types
          toValueNode(data[k]),
    } as ArgumentNode;
    args.push(argNode);
  });
  return args;
}

export function getDirectiveNodes(
  values: Directive[],
  sc: SchemaComposer<any>
  // Relax type definitions, because in Graphql@16 it became ConstDirectiveNode
  // was definition ReadonlyArray<DirectiveNode> | undefined
): ReadonlyArray<any> | undefined {
  if (!values || !values.length) return;
  return values.map(
    (v) =>
      ({
        kind: Kind.DIRECTIVE,
        name: getNameNode(v.name),
        arguments: v.args && getDirectiveArgumentNodes(v.args, sc._getDirective(v.name)),
      }) as DirectiveNode
  );
}

export function getInterfaceNodes(
  ifaces: InterfaceTypeComposerThunked<any, any>[]
): ReadonlyArray<NamedTypeNode> {
  return ifaces
    .map((iface) => {
      if (!iface || !iface.getTypeName) return;
      return {
        kind: Kind.NAMED_TYPE,
        name: getNameNode(iface.getTypeName()),
      } as NamedTypeNode;
    })
    .filter(Boolean) as any;
}

export function getTypeNode(atc: AnyTypeComposer<any>): TypeNode | undefined {
  if (atc instanceof ThunkComposer) {
    return getTypeNode(atc.ofType);
  } else if (atc instanceof ListComposer) {
    const subType = getTypeNode(atc.ofType);
    if (!subType) return;
    return {
      kind: Kind.LIST_TYPE,
      type: subType,
    };
  } else if (atc instanceof NonNullComposer) {
    const subType = getTypeNode(atc.ofType);
    if (!subType) return;
    return {
      kind: Kind.NON_NULL_TYPE,
      type: subType as any,
    };
  } else if (atc && atc.getTypeName) {
    return {
      kind: Kind.NAMED_TYPE,
      name: getNameNode(atc.getTypeName()),
    };
  }
  return undefined;
}

export function getArgumentsDefinitionNodes(
  tc: ObjectTypeComposer<any, any> | InterfaceTypeComposer<any, any>,
  fieldName: string
): ReadonlyArray<InputValueDefinitionNode> | undefined {
  const argNames = tc.getFieldArgNames(fieldName);
  if (!argNames.length) return;
  return argNames
    .map((argName) => {
      const ac = tc.getFieldArg(fieldName, argName);
      const type = getTypeNode(ac.type);
      if (!type) return;
      return {
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: getNameNode(argName),
        type,
        description: getDescriptionNode(ac.description),
        directives: getDirectiveNodes(
          tc.getFieldArgDirectives(fieldName, argName),
          tc.schemaComposer
        ),
        defaultValue:
          (ac.defaultValue !== undefined &&
            astFromValueSafe(ac.defaultValue, tc.getFieldArgType(fieldName, argName))) ||
          undefined,
      } as InputValueDefinitionNode;
    })
    .filter(Boolean) as any;
}

export function getFieldDefinitionNodes(
  tc: ObjectTypeComposer<any, any> | InterfaceTypeComposer<any, any>
): ReadonlyArray<FieldDefinitionNode> | undefined {
  const fieldNames = tc.getFieldNames();
  if (!fieldNames.length) return;
  return fieldNames
    .map((fieldName) => {
      const fc = tc.getField(fieldName);
      const type = getTypeNode(fc.type);
      if (!type) return;
      return {
        kind: Kind.FIELD_DEFINITION,
        name: getNameNode(fieldName),
        type,
        arguments: getArgumentsDefinitionNodes(tc, fieldName),
        description: getDescriptionNode(fc.description),
        directives: getDirectiveNodes(tc.getFieldDirectives(fieldName), tc.schemaComposer),
      } as FieldDefinitionNode;
    })
    .filter(Boolean) as any;
}

export function getInputValueDefinitionNodes(
  tc: InputTypeComposer<any>
): ReadonlyArray<InputValueDefinitionNode> | undefined {
  const fieldNames = tc.getFieldNames();
  if (!fieldNames.length) return;
  return fieldNames
    .map((fieldName) => {
      const fc = tc.getField(fieldName);
      const type = getTypeNode(fc.type);
      if (!type) return;
      return {
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: getNameNode(fieldName),
        type,
        description: getDescriptionNode(fc.description),
        directives: getDirectiveNodes(tc.getFieldDirectives(fieldName), tc.schemaComposer),
        defaultValue:
          (fc.defaultValue !== undefined &&
            astFromValueSafe(fc.defaultValue, tc.getFieldType(fieldName))) ||
          undefined,
      } as InputValueDefinitionNode;
    })
    .filter(Boolean) as any;
}

export function getNameNode(value: string): NameNode {
  return { kind: Kind.NAME, value };
}

export function getEnumValueDefinitionNodes(
  tc: EnumTypeComposer<any>
): ReadonlyArray<EnumValueDefinitionNode> | undefined {
  const fieldNames = tc.getFieldNames();
  if (!fieldNames.length) return;
  return fieldNames.map((fieldName) => {
    const fc = tc.getField(fieldName);
    return {
      kind: Kind.ENUM_VALUE_DEFINITION,
      name: getNameNode(fieldName),
      description: getDescriptionNode(fc.description),
      directives: getDirectiveNodes(tc.getFieldDirectives(fieldName), tc.schemaComposer),
    } as EnumValueDefinitionNode;
  });
}

export function parseValueNode(
  ast: ValueNode,
  variables: Record<string, any> = {},
  typeName?: string
): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT:
      const value = Object.create(null);
      ast.fields.forEach((field) => {
        value[field.name.value] = parseValueNode(field.value, variables, typeName);
      });
      return value;
    case Kind.LIST:
      return ast.values.map((n) => parseValueNode(n, variables, typeName));
    case Kind.NULL:
      return null;
    case Kind.VARIABLE:
      return variables ? variables[ast.name.value] : undefined;
    default:
      throw new TypeError(`${typeName} cannot represent value: ${inspect(ast)}`);
  }
}

function astFromValueSafe(value: unknown, type: GraphQLInputType): ReturnType<typeof astFromValue> {
  try {
    return astFromValue(value, type);
  } catch (e) {
    return toValueNode(value);
  }
}
