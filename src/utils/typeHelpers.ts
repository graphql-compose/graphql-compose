/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { isType, isNamedType, parse, isOutputType, isInputType } from '../graphql';
import type {
  GraphQLType,
  GraphQLNamedType,
  GraphQLOutputType,
  GraphQLInputType,
} from '../graphql';
import { isFunction } from './is';
import { inspect } from './misc';
import { dedent } from './dedent';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import { Resolver } from '../Resolver';
import { NonNullComposer } from '../NonNullComposer';
import { ListComposer } from '../ListComposer';
import { ThunkComposer } from '../ThunkComposer';
import type { TypeAsString } from '../TypeMapper';
import type { SchemaComposer } from '../SchemaComposer';
import deprecate from './deprecate';

export type AnyTypeComposer<TContext> =
  | NamedTypeComposer<TContext>
  | ListComposer<any>
  | NonNullComposer<any>
  | ThunkComposer<any, any>;

export type NamedTypeComposer<TContext> =
  | ObjectTypeComposer<any, TContext>
  | InputTypeComposer<TContext>
  | EnumTypeComposer<TContext>
  | InterfaceTypeComposer<any, TContext>
  | UnionTypeComposer<any, TContext>
  | ScalarTypeComposer<TContext>;

// Output type should not have `TSource`. It should not affect on main Type source!
export type ComposeNamedOutputType<TContext> =
  | ObjectTypeComposer<any, TContext>
  | EnumTypeComposer<TContext>
  | ScalarTypeComposer<TContext>
  | InterfaceTypeComposer<any, TContext>
  | UnionTypeComposer<any, TContext>;

export type ComposeOutputType<TContext> =
  | ComposeNamedOutputType<TContext>
  | NonNullComposer<any>
  | ListComposer<any>
  | ThunkComposer<any, GraphQLOutputType>;

export type ComposeOutputTypeDefinition<TContext> =
  | Readonly<ComposeOutputType<TContext>>
  | Readonly<GraphQLOutputType>
  | TypeAsString
  | ReadonlyArray<
      | Readonly<ComposeOutputType<TContext>>
      | Readonly<GraphQLOutputType>
      | TypeAsString
      | ReadonlyArray<
          Readonly<ComposeOutputType<TContext>> | Readonly<GraphQLOutputType> | TypeAsString
        >
    >;

export type ComposeNamedInputType<TContext> =
  | InputTypeComposer<TContext>
  | EnumTypeComposer<TContext>
  | ScalarTypeComposer<TContext>;

export type ComposeInputType =
  | ComposeNamedInputType<any>
  | ThunkComposer<ComposeNamedInputType<any>, GraphQLInputType>
  | NonNullComposer<
      | ComposeNamedInputType<any>
      | ThunkComposer<ComposeNamedInputType<any>, GraphQLInputType>
      | ListComposer<any>
    >
  | ListComposer<
      | ComposeNamedInputType<any>
      | ThunkComposer<ComposeNamedInputType<any>, GraphQLInputType>
      | ListComposer<any>
      | NonNullComposer<any>
    >;

export type ComposeInputTypeDefinition =
  | TypeAsString
  | Readonly<ComposeInputType>
  | Readonly<GraphQLInputType>
  | ReadonlyArray<
      | TypeAsString
      | Readonly<ComposeInputType>
      | Readonly<GraphQLInputType>
      | ReadonlyArray<TypeAsString | Readonly<ComposeInputType> | Readonly<GraphQLInputType>>
    >;

/**
 * Check that string is a valid GraphQL Type name.
 * According to spec valid mask is `/^[_A-Za-z][_0-9A-Za-z]*$/`.
 *
 * Valid names: Person, _Type, Zone51
 * Invalid names: 123, 1c, String!, @Type, A-
 */
export function isTypeNameString(str: string): boolean {
  return /^[_A-Za-z][_0-9A-Za-z]*$/.test(str);
}

/**
 * Check that provided string is a valid GraphQL type name
 * which can be wrapped by modifiers `[]` or `!`
 *
 * Valid names: Person, Type!, [[Zone51]!]!
 * Invalid names: !1c, [String, @Type
 */
export function isWrappedTypeNameString(str: string): boolean {
  return isTypeNameString(unwrapTypeNameString(str));
}

/**
 * Checks that string is SDL definition of some type
 * eg. `type Out { name: String! }` or `input Filter { minAge: Int }` etc.
 */
export function isTypeDefinitionString(str: string): boolean {
  return (
    isOutputTypeDefinitionString(str) ||
    isInputTypeDefinitionString(str) ||
    isEnumTypeDefinitionString(str) ||
    isScalarTypeDefinitionString(str) ||
    isInterfaceTypeDefinitionString(str) ||
    isUnionTypeDefinitionString(str)
  );
}

/**
 * Checks that string is SDL definition of any Output type
 */
export function isSomeOutputTypeDefinitionString(str: string): boolean {
  return (
    isOutputTypeDefinitionString(str) ||
    isEnumTypeDefinitionString(str) ||
    isScalarTypeDefinitionString(str) ||
    isInterfaceTypeDefinitionString(str) ||
    isUnionTypeDefinitionString(str)
  );
}

/**
 * Checks that string is SDL definition of any Input type
 */
export function isSomeInputTypeDefinitionString(str: string): boolean {
  return (
    isInputTypeDefinitionString(str) ||
    isEnumTypeDefinitionString(str) ||
    isScalarTypeDefinitionString(str)
  );
}

/**
 * Checks that string is OutputType SDL definition
 * eg. `type Out { name: String! }`
 */
export function isOutputTypeDefinitionString(str: string): boolean {
  return /type\s[^{]+\{[^}]+\}/im.test(str);
}

/**
 * Checks that string is InputType SDL definition
 * eg. `input Filter { minAge: Int }`
 */
export function isInputTypeDefinitionString(str: string): boolean {
  return /input\s[^{]+\{[^}]+\}/im.test(str);
}

/**
 * Checks that string is EnumType SDL definition
 * eg. `enum Sort { ASC DESC }`
 */
export function isEnumTypeDefinitionString(str: string): boolean {
  return /enum\s[^{]+\{[^}]+\}/im.test(str);
}

/**
 * Checks that string is ScalarType SDL definition
 * eg. `scalar UInt`
 */
export function isScalarTypeDefinitionString(str: string): boolean {
  return /scalar\s/im.test(str);
}

/**
 * Checks that string is InterfaceType SDL definition
 * eg. `interface User { name: String }`
 */
export function isInterfaceTypeDefinitionString(str: string): boolean {
  return /interface\s/im.test(str);
}

/**
 * Checks that string is UnionType SDL definition
 * eg. `union User = A | B`
 */
export function isUnionTypeDefinitionString(str: string): boolean {
  return /union\s/im.test(str);
}

/**
 * Check that provided TypeComposer is OutputType (Object, Scalar, Enum, Interface, Union).
 * It may be wrapped in NonNull or List.
 */
export function isSomeOutputTypeComposer(type: any): type is ComposeOutputType<any> {
  return (
    type instanceof ObjectTypeComposer ||
    type instanceof InterfaceTypeComposer ||
    type instanceof EnumTypeComposer ||
    type instanceof UnionTypeComposer ||
    type instanceof ScalarTypeComposer ||
    (type instanceof NonNullComposer && isSomeOutputTypeComposer(type.ofType)) ||
    (type instanceof ListComposer && isSomeOutputTypeComposer(type.ofType)) ||
    type instanceof ThunkComposer
  );
}

/**
 * Check that provided TypeComposer is InputType (InputObject, Scalar, Enum).
 * It may be wrapped in NonNull or List.
 */
export function isSomeInputTypeComposer(type: any): type is ComposeInputType {
  return (
    type instanceof InputTypeComposer ||
    type instanceof EnumTypeComposer ||
    type instanceof ScalarTypeComposer ||
    (type instanceof NonNullComposer && isSomeInputTypeComposer(type.ofType)) ||
    (type instanceof ListComposer && isSomeInputTypeComposer(type.ofType)) ||
    type instanceof ThunkComposer
  );
}

export function isComposeNamedType(type: any): type is NamedTypeComposer<any> | GraphQLNamedType {
  return (
    isNamedType(type) ||
    type instanceof ObjectTypeComposer ||
    type instanceof InputTypeComposer ||
    type instanceof InterfaceTypeComposer ||
    type instanceof EnumTypeComposer ||
    type instanceof UnionTypeComposer ||
    type instanceof ScalarTypeComposer
  );
}

export function isComposeType(type: any): type is AnyTypeComposer<any> {
  return (
    isComposeNamedType(type) ||
    (Array.isArray(type) && isComposeType(type[0])) ||
    type instanceof NonNullComposer ||
    type instanceof ListComposer ||
    type instanceof ThunkComposer ||
    type instanceof Resolver ||
    isType(type)
  );
}

export function isComposeOutputType(type: any): type is ComposeOutputTypeDefinition<any> {
  return (
    isOutputType(type) ||
    (Array.isArray(type) && isComposeOutputType(type[0])) ||
    isSomeOutputTypeComposer(type) ||
    type instanceof Resolver
  );
}

export function isComposeInputType(type: any): type is ComposeInputTypeDefinition {
  return (
    isInputType(type) ||
    (Array.isArray(type) && isComposeInputType(type[0])) ||
    isSomeInputTypeComposer(type)
  );
}

export type AnyType<TContext> = NamedTypeComposer<TContext> | GraphQLNamedType;

export function isNamedTypeComposer(type: any): type is NamedTypeComposer<any> {
  return (
    type instanceof ObjectTypeComposer ||
    type instanceof InputTypeComposer ||
    type instanceof ScalarTypeComposer ||
    type instanceof EnumTypeComposer ||
    type instanceof InterfaceTypeComposer ||
    type instanceof UnionTypeComposer
  );
}

export function isTypeComposer(type: any): type is AnyTypeComposer<any> {
  return (
    isNamedTypeComposer(type) ||
    type instanceof ListComposer ||
    type instanceof NonNullComposer ||
    type instanceof ThunkComposer
  );
}

export function getGraphQLType(anyType: any): GraphQLType {
  let type = anyType;

  // extract type from ObjectTypeComposer, InputTypeComposer, EnumTypeComposer and Resolver
  if (type && isFunction(type.getType)) {
    type = type.getType();
  }

  if (!isType(type)) {
    throw new Error(`You provide incorrect type for 'getGraphQLType' method: ${inspect(type)}`);
  }

  return type;
}

export function getComposeTypeName(type: any, sc: SchemaComposer<any>): string {
  if (typeof type === 'string') {
    if (/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(type)) {
      // single type name
      return type;
    } else {
      // parse type name from `type Name { f: Int }`
      const docNode = parse(type) as any;
      if (
        docNode.definitions[0] &&
        docNode.definitions[0].name &&
        typeof docNode.definitions[0].name.value === 'string'
      ) {
        return docNode.definitions[0].name.value;
      }
    }

    throw new Error(`Cannot get type name from string: ${inspect(type)}`);
  } else if (isFunction(type)) {
    return getComposeTypeName((type as any)(sc), sc);
  } else if (isNamedTypeComposer(type)) {
    return type.getTypeName();
  } else {
    try {
      const gqlType = getGraphQLType(type) as any;
      if (typeof gqlType.name === 'string') {
        return gqlType.name;
      }
    } catch (e) {
      throw new Error(`Cannot get type name from ${inspect(type)}`);
    }
  }

  throw new Error(`Cannot get type name from ${inspect(type)}`);
}

export function unwrapTC<TContext>(anyTC: AnyTypeComposer<TContext>): NamedTypeComposer<TContext> {
  if (
    anyTC instanceof NonNullComposer ||
    anyTC instanceof ListComposer ||
    anyTC instanceof ThunkComposer
  ) {
    const unwrappedTC = anyTC.getUnwrappedTC();
    return unwrapTC(unwrappedTC);
  }
  return anyTC;
}

export function unwrapInputTC(inputTC: ComposeInputType): ComposeNamedInputType<any> {
  return unwrapTC(inputTC) as any;
}

export function unwrapOutputTC<TContext>(
  outputTC: ComposeOutputType<TContext>
): ComposeNamedOutputType<TContext> {
  return unwrapTC(outputTC) as any;
}

/**
 * @deprecated Use `replaceTC()` function instead.
 */
export function changeUnwrappedTC<TContext, T>(
  anyTC: T,
  cb: (tc: NamedTypeComposer<TContext>) => NamedTypeComposer<TContext>
): T {
  deprecate('Please use `replaceTC()` function instead.');
  return replaceTC(anyTC, cb);
}

/**
 * Replace one TC to another.
 * If type is wrapped with List, NonNull, Thunk then will be replaced inner type and all wrappers will be preserved in the same order.
 *
 * @example
 *   1) replaceTC(A, B)
 *      // returns `B`
 *   2) replaceTC(ListComposer(NonNullComposer(A)), B)
 *      // returns `ListComposer(NonNullComposer(B))`
 *   3) replaceTC(ListComposer(A), (A) => { A.addFields({ f: 'Int' }); return A; })
 *      // returns `ListComposer(A)` where A will be with new field
 *   4) replaceTC(ListComposer(A), (A) => { return someCheck(A) ? B : C; })
 *      // returns `ListComposer(B or C)` B or C depends on `someCheck`
 *
 * @param anyTC may be AnyTypeComposer
 * @param replaceByTC can be a NamedTypeComposer or a callback which gets NamedTypeComposer and should return updated or new NamedTypeComposer
 */
export function replaceTC<T>(
  anyTC: T,
  replaceByTC:
    | Readonly<NamedTypeComposer<any>>
    | ((unwrappedTC: NamedTypeComposer<any>) => NamedTypeComposer<any>)
): T {
  let tc = anyTC as any;

  const wrappers = [];
  while (
    tc instanceof ListComposer ||
    tc instanceof NonNullComposer ||
    tc instanceof ThunkComposer
  ) {
    if (tc instanceof ThunkComposer) {
      tc = tc.getUnwrappedTC();
    } else {
      wrappers.unshift(tc.constructor);
      tc = tc.ofType;
    }
  }

  // call callback for TC
  tc = isFunction(replaceByTC) ? replaceByTC(tc as any) : replaceByTC;

  if (tc) {
    // wrap TypeComposer back
    tc = wrappers.reduce((type: any, Wrapper: any) => new Wrapper(type), tc);
  }

  return tc as any;
}

/**
 * Remove modifiers `[]` and `!` from type name.
 *
 * Eg. Int! -> Int, [String]! -> String
 */
export function unwrapTypeNameString(str: string): string {
  if (str.endsWith('!')) {
    return unwrapTypeNameString(str.slice(0, -1));
  } else if (str.startsWith('[') && str.endsWith(']')) {
    return unwrapTypeNameString(str.slice(1, -1));
  }
  return str;
}

/**
 * Clone any type to the new SchemaComposer.
 * It may be: ComposeType, string, Wrapped ComposeType, GraphQL any type
 */
export function cloneTypeTo(
  type: AnyTypeComposer<any> | TypeAsString | GraphQLType,
  anotherSchemaComposer: SchemaComposer<any>,
  cloneMap: Map<any, any> = new Map()
): AnyTypeComposer<any> | TypeAsString {
  if (cloneMap.has(type)) {
    return cloneMap.get(type) as any;
  } else if (typeof type === 'string') {
    return type;
  } else if (isComposeType(type)) {
    if (Array.isArray(type)) return type[0].cloneTo(anotherSchemaComposer, cloneMap);
    else return (type as any).cloneTo(anotherSchemaComposer, cloneMap);
  } else if (isType(type)) {
    // create new TC directly in new schema
    const tc = anotherSchemaComposer.typeMapper.convertGraphQLTypeToComposer(type);
    cloneMap.set(type, tc);
    return tc;
  } else {
    throw new Error(dedent`
      Something strange was provided to utils cloneTypeTo() method:
        ${inspect(type)}
    `);
  }
}
