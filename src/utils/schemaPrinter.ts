/* eslint-disable consistent-return */

// copied from https://github.com/graphql/graphql-js/blob/master/src/utilities/printSchema.js
// added printNodeDirectives() method

import { invariant, inspect } from './misc';
import { print } from 'graphql/language/printer';
import { printBlockString } from 'graphql/language/blockString';
import type { DirectiveNode } from 'graphql/language/ast';
import type { GraphQLSchema } from 'graphql/type/schema';
import { isIntrospectionType } from 'graphql/type/introspection';
import { isSpecifiedScalarType } from 'graphql/type/scalars';
import { GraphQLDirective, isSpecifiedDirective } from 'graphql/type/directives';
import {
  GraphQLArgument,
  GraphQLNamedType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLInputObjectType,
  isScalarType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
  isInputObjectType,
  GraphQLInputField,
  GraphQLField,
} from 'graphql/type/definition';
import { astFromValue } from 'graphql/utilities/astFromValue';

import { SchemaComposer } from '../SchemaComposer';
import { SchemaFilterTypes, getTypesFromSchema, getDirectivesFromSchema } from './getFromSchema';

import { CompareTypeComposersOption, getSortMethodFromOption } from './schemaPrinterSortTypes';
import { graphqlVersion } from './graphqlVersion';

let printBlockStringLegacy: (value: string, preferMultipleLines?: boolean | undefined) => string;
if (graphqlVersion >= 16) {
  printBlockStringLegacy = printBlockString as any;
} else {
  printBlockStringLegacy = (value: string, preferMultipleLines?: boolean | undefined) =>
    (printBlockString as any)(value, '', preferMultipleLines);
}

type Options = {
  /**
   * Descriptions are defined as preceding string literals, however an older
   * experimental version of the SDL supported preceding comments as
   * descriptions. Set to true to enable this deprecated behavior.
   * This option is provided to ease adoption and will be removed in v16.
   *
   * Default: false
   */
  commentDescriptions?: boolean | null;

  /**
   * Do not print descriptions for types
   *
   * Default: false
   */
  omitDescriptions?: boolean | null;

  /**
   * Do not print Scalars for types
   *
   * Default: false
   */
  omitScalars?: boolean | null;

  /**
   * Do not print @specifiedByUrl for Scalars types
   *
   * Default: false
   */
  omitSpecifiedByUrl?: boolean | null;

  /**
   * Sort fields, args and interfaces.
   * Useful for snapshot testing.
   *
   * Default: false
   */
  sortAll?: boolean;
  sortFields?: boolean;
  sortArgs?: boolean;
  sortInterfaces?: boolean;
  sortUnions?: boolean;
  sortEnums?: boolean;
  sortTypes?: CompareTypeComposersOption;
};

export type SchemaPrinterOptions = Options;

export type SchemaComposerPrinterOptions = Options & SchemaFilterTypes;

interface PrinterFilterOptions {
  optPrinter: SchemaPrinterOptions;
  optFilter: SchemaFilterTypes;
}

function splitOptionsFilterPrinter(options?: SchemaComposerPrinterOptions): PrinterFilterOptions {
  const { exclude = [], include, omitDirectiveDefinitions, ...optPrinter } = options || {};
  const optFilter = { exclude, include, omitDirectiveDefinitions };
  return { optPrinter, optFilter };
}

/**
 * Return schema as a SDL string.
 */
export function printSchemaComposer(
  sc: SchemaComposer<any>,
  options?: SchemaComposerPrinterOptions
): string {
  const { optPrinter, optFilter } = splitOptionsFilterPrinter(options);

  const printTypes = Array.from(getTypesFromSchema(sc, optFilter));

  const sortMethod = getSortMethodFromOption(optPrinter?.sortTypes, optFilter);
  if (sortMethod) printTypes.sort(sortMethod);

  const res = [];
  if (!optFilter.omitDirectiveDefinitions) {
    res.push(...getDirectivesFromSchema(sc).map((d) => printDirective(d, optPrinter)));
  }
  res.push(...printTypes.map((tc) => tc.toSDL(optPrinter)));

  return res.filter(Boolean).join('\n\n');
}

/**
 * Accepts options as a second argument:
 *
 *    - commentDescriptions:
 *        Provide true to use preceding comments as the description.
 *
 */
export function printSchema(schema: GraphQLSchema, options?: Options): string {
  return printFilteredSchema(schema, (n) => !isSpecifiedDirective(n), isDefinedType, options);
}

export function printIntrospectionSchema(schema: GraphQLSchema, options?: Options): string {
  return printFilteredSchema(schema, isSpecifiedDirective, isIntrospectionType, options);
}

export function isDefinedType(type: GraphQLNamedType): boolean {
  return !isSpecifiedScalarType(type) && !isIntrospectionType(type);
}

export function printFilteredSchema(
  schema: GraphQLSchema,
  directiveFilter: (type: GraphQLDirective) => boolean,
  typeFilter: (type: GraphQLNamedType) => boolean,
  options?: Options
): string {
  const directives = schema.getDirectives().filter(directiveFilter);
  const typeMap = schema.getTypeMap();
  const types = (Object.values(typeMap) as GraphQLNamedType[])
    .sort((type1, type2) => type1.name.localeCompare(type2.name))
    .filter(typeFilter);

  return `${[printSchemaDefinition(schema)]
    .concat(
      directives.map((directive) => printDirective(directive, options)),
      types.map((type) => printType(type, options))
    )
    .filter(Boolean)
    .join('\n\n')}\n`;
}

export function printSchemaDefinition(schema: GraphQLSchema): string {
  if (isSchemaOfCommonNames(schema)) {
    return '';
  }

  const operationTypes = [];

  const queryType = schema.getQueryType();
  if (queryType) {
    operationTypes.push(`  query: ${queryType.name}`);
  }

  const mutationType = schema.getMutationType();
  if (mutationType) {
    operationTypes.push(`  mutation: ${mutationType.name}`);
  }

  const subscriptionType = schema.getSubscriptionType();
  if (subscriptionType) {
    operationTypes.push(`  subscription: ${subscriptionType.name}`);
  }

  return `schema {\n${operationTypes.join('\n')}\n}`;
}

/**
 * GraphQL schema define root types for each type of operation. These types are
 * the same as any other type and can be named in any manner, however there is
 * a common naming convention:
 *
 *   schema {
 *     query: Query
 *     mutation: Mutation
 *   }
 *
 * When using this naming convention, the schema description can be omitted.
 */
export function isSchemaOfCommonNames(schema: GraphQLSchema): boolean {
  const queryType = schema.getQueryType();
  if (queryType && queryType.name !== 'Query') {
    return false;
  }

  const mutationType = schema.getMutationType();
  if (mutationType && mutationType.name !== 'Mutation') {
    return false;
  }

  const subscriptionType = schema.getSubscriptionType();
  if (subscriptionType && subscriptionType.name !== 'Subscription') {
    return false;
  }

  return true;
}

export function printType(type: GraphQLNamedType, options?: Options): string {
  if (isScalarType(type)) {
    return printScalar(type, options);
  } else if (isObjectType(type)) {
    return printObject(type, options);
  } else if (isInterfaceType(type)) {
    return printInterface(type, options);
  } else if (isUnionType(type)) {
    return printUnion(type, options);
  } else if (isEnumType(type)) {
    return printEnum(type, options);
  } else if (isInputObjectType(type)) {
    return printInputObject(type, options);
  }

  // Not reachable. All possible types have been considered.
  invariant(false, `Unexpected type: ${inspect(type as never)}`);
  return '';
}

export function printScalar(type: GraphQLScalarType, options?: Options): string {
  if (options?.omitScalars) return '';
  return `${printDescription(type, options)}scalar ${type.name}${printNodeDirectives(
    type.astNode
  )}`;
}

export function printImplementedInterfaces(
  type: GraphQLObjectType | GraphQLInterfaceType,
  options?: Options
): string {
  const interfaces = (type.getInterfaces ? type.getInterfaces() : []) as GraphQLInterfaceType[];
  if (!interfaces.length) return '';
  if (options?.sortAll || options?.sortInterfaces) {
    return ` implements ${interfaces
      .map((i) => i.name)
      .sort()
      .join(' & ')}`;
  }
  return ` implements ${interfaces.map((i) => i.name).join(' & ')}`;
}

export function printObject(type: GraphQLObjectType, options?: Options): string {
  return `${printDescription(type, options)}type ${type.name}${printImplementedInterfaces(
    type,
    options
  )}${printNodeDirectives(type.astNode)}${printFields(type, options)}`;
}

export function printInterface(type: GraphQLInterfaceType, options?: Options): string {
  return `${printDescription(type, options)}interface ${type.name}${printImplementedInterfaces(
    type,
    options
  )}${printNodeDirectives(type.astNode)}${printFields(type, options)}`;
}

export function printUnion(type: GraphQLUnionType, options?: Options): string {
  let types = type.getTypes();
  if (options?.sortAll || options?.sortUnions) {
    types = [...types].sort();
  }
  const possibleTypes = types.length ? ` = ${types.join(' | ')}` : '';
  return `${printDescription(type, options)}union ${type.name}${printNodeDirectives(
    type.astNode
  )}${possibleTypes}`;
}

export function printEnum(type: GraphQLEnumType, options?: Options): string {
  let values = type.getValues();
  if (options?.sortAll || options?.sortEnums) {
    values = [...values].sort((a, b) => a.name.localeCompare(b.name));
  }

  const valuesList = values.map(
    (value, i) =>
      `${printDescription(value, options, '  ', !i)}  ${value.name}${printNodeDirectives(
        value.astNode
      )}`
  );

  return `${printDescription(type, options)}enum ${type.name}${printNodeDirectives(
    type.astNode
  )}${printBlock(valuesList)}`;
}

export function printInputObject(type: GraphQLInputObjectType, options?: Options): string {
  let fields = Object.values(type.getFields()) as GraphQLInputField[];
  if (options?.sortAll || options?.sortFields) {
    fields = fields.sort((a, b) => a.name.localeCompare(b.name));
  }

  const fieldsList = fields.map(
    (f, i) => `${printDescription(f, options, '  ', !i)}  ${printInputValue(f)}`
  );
  return `${printDescription(type, options)}input ${type.name}${printNodeDirectives(
    type.astNode
  )}${printBlock(fieldsList)}`;
}

export function printFields(
  type: GraphQLObjectType | GraphQLInterfaceType,
  options?: Options
): string {
  let fields = Object.values(type.getFields()) as GraphQLField<any, any>[];
  if (options?.sortAll || options?.sortFields) {
    fields = fields.sort((a, b) => a.name.localeCompare(b.name));
  }

  const fieldsList = fields.map(
    (f, i) =>
      `${printDescription(f, options, '  ', !i)}  ${f.name}${printArgs(
        f.args,
        options,
        '  '
      )}: ${String(f.type)}${printNodeDirectives(f.astNode)}`
  );
  return printBlock(fieldsList);
}

export function printBlock(items: Array<string>): string {
  return items.length !== 0 ? ` {\n${items.join('\n')}\n}` : '';
}

export function printArgs(
  _args: ReadonlyArray<GraphQLArgument>,
  options?: Options,
  indentation: string = ''
): string {
  if (_args.length === 0) {
    return '';
  }

  const args =
    options?.sortAll || options?.sortArgs
      ? [..._args].sort((a, b) => a.name.localeCompare(b.name))
      : _args;

  // If every arg does not have a description, print them on one line.
  if (args.every((arg) => !arg.description)) {
    return `(${args.map(printInputValue).join(', ')})`;
  }

  return `(\n${args
    .map(
      (arg, i) =>
        `${printDescription(arg, options, `  ${indentation}`, !i)}  ${indentation}${printInputValue(
          arg
        )}`
    )
    .join('\n')}\n${indentation})`;
}

export function printInputValue(arg: GraphQLArgument | GraphQLInputField): string {
  const defaultAST = astFromValue(arg.defaultValue, arg.type);
  let argDecl = `${arg.name}: ${String(arg.type)}`;
  if (defaultAST) {
    argDecl += ` = ${print(defaultAST)}`;
  }
  return `${argDecl}${printNodeDirectives(arg.astNode)}`;
}

export function printDirective(directive: GraphQLDirective, options?: Options): string {
  return `${printDescription(directive, options)}directive @${directive.name}${printArgs(
    directive.args as GraphQLArgument[],
    options
  )}${directive.isRepeatable ? ' repeatable' : ''} on ${directive.locations.join(' | ')}`;
}

export function printNodeDirectives(
  node:
    | {
        directives?: ReadonlyArray<DirectiveNode>;
      }
    | undefined
    | null
): string {
  if (!node || !node.directives || !node.directives.length) return '';
  return ` ${node.directives
    .map((d) => {
      let args = '';
      if (d.arguments && d.arguments.length) {
        args = `(${d.arguments.map((a) => `${a.name.value}: ${print(a.value)}`).join(', ')})`;
      }
      return `@${d.name.value}${args}`;
    })
    .join(' ')}`;
}

export function printDescription(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  def: any,
  options?: Options,
  indentation: string = '',
  firstInBlock: boolean = true
): string {
  let { description } = def;
  if (description == null || options?.omitDescriptions) {
    return '';
  }

  // remove trailing spaces for old GraphQL versions
  description = (description as string).trimRight();

  if (options && options.commentDescriptions) {
    return printDescriptionWithComments(description, indentation, firstInBlock);
  }

  const preferMultipleLines = description.length > 70;
  const blockString = printBlockStringLegacy(description, preferMultipleLines);
  const prefix = indentation && !firstInBlock ? `\n${indentation}` : indentation;

  return `${prefix + blockString.replace(/\n/g, `\n${indentation}`)}\n`;
}

export function printDescriptionWithComments(
  description: string,
  indentation: string,
  firstInBlock: boolean
): string {
  const prefix = indentation && !firstInBlock ? '\n' : '';
  const comment = description
    .split('\n')
    .map((line) => indentation + (line !== '' ? `# ${line}` : '#'))
    .join('\n');

  return `${prefix + comment}\n`;
}
