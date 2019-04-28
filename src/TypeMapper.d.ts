import { GraphQLType } from 'graphql';
import { SchemaComposer } from './SchemaComposer';
import {
  InputTypeComposerFieldConfig,
  InputTypeComposerFieldConfigMap,
  InputTypeComposerFieldConfigDefinition,
  InputTypeComposerFieldConfigMapDefinition,
} from './InputTypeComposer';
import {
  ObjectTypeComposer,
  ObjectTypeComposerArgumentConfig,
  ObjectTypeComposerFieldConfig,
  ObjectTypeComposerFieldConfigDefinition,
  ObjectTypeComposerFieldConfigMapDefinition,
  ObjectTypeComposerArgumentConfigDefinition,
  ObjectTypeComposerArgumentConfigMapDefinition,
  ObjectTypeComposerArgumentConfigMap,
  ObjectTypeComposerFieldConfigMap,
  ObjectTypeComposerDefinition,
} from './ObjectTypeComposer';
import {
  InterfaceTypeComposerDefinition,
  InterfaceTypeComposerThunked,
} from './InterfaceTypeComposer';
import { Thunk } from './utils/definitions';
import { Resolver } from './Resolver';
import { TypeStorage } from './TypeStorage';
import {
  AnyTypeComposer,
  ComposeOutputType,
  ComposeOutputTypeDefinition,
  ComposeInputType,
  ComposeInputTypeDefinition,
  NamedTypeComposer,
} from './utils/typeHelpers';

/**
 * Eg. `type Name { field: Int }`
 */
export type TypeDefinitionString = string;

/**
 * Eg. `Int`, `Int!`, `[Int]`
 */
export type TypeWrappedString = string;

/**
 * Eg. `Int`, `Float`
 */
export type TypeNameString = string;

export type TypeAsString = TypeDefinitionString | TypeWrappedString | TypeNameString;

/**
 * Type storage and type generator from `Schema Definition Language` (`SDL`).
 * This is slightly rewritten [buildASTSchema](https://github.com/graphql/graphql-js/blob/master/src/utilities/buildASTSchema.js)
 * utility from `graphql-js` that allows to create type from a string (SDL).
 */
declare class TypeMapper<TContext> {
  public schemaComposer: SchemaComposer<TContext>;

  public constructor(schemaComposer: SchemaComposer<TContext>);

  protected _initScalars(): void;

  /**
   * Check that provided TypeComposer is OutputType (Object, Scalar, Enum, Interface, Union).
   * It may be wrapped in NonNull or List.
   */
  public static isOutputType(type: any): type is ComposeOutputType<any>;

  /**
   * Check that provided TypeComposer is InputType (InputObject, Scalar, Enum).
   * It may be wrapped in NonNull or List.
   */
  public static isInputType(type: any): type is ComposeInputType;

  /**
   * Check that string is a valid GraphQL Type name.
   * According to spec valid mask is `/^[_A-Za-z][_0-9A-Za-z]*$/`.
   */
  public static isTypeNameString(str: string): boolean;

  /**
   * Checks that string is SDL definition of some type
   * eg. `type Out { name: String! }` or `input Filter { minAge: Int }` etc.
   */
  public static isTypeDefinitionString(str: string): boolean;

  /**
   * Checks that string is OutputType SDL definition
   * eg. `type Out { name: String! }`
   */
  public static isOutputTypeDefinitionString(str: string): boolean;

  /**
   * Checks that string is InputType SDL definition
   * eg. `input Filter { minAge: Int }`
   */
  public static isInputTypeDefinitionString(str: string): boolean;

  /**
   * Checks that string is EnumType SDL definition
   * eg. `enum Sort { ASC DESC }`
   */
  public static isEnumTypeDefinitionString(str: string): boolean;

  /**
   * Checks that string is ScalarType SDL definition
   * eg. `scalar UInt`
   */
  public static isScalarTypeDefinitionString(str: string): boolean;

  /**
   * Checks that string is InterfaceType SDL definition
   * eg. `interface User { name: String }`
   */
  public static isInterfaceTypeDefinitionString(str: string): boolean;

  public convertGraphQLTypeToComposer(type: GraphQLType): AnyTypeComposer<TContext>;

  public convertSDLWrappedTypeName(str: TypeWrappedString | TypeNameString): GraphQLType | null;

  public convertSDLTypeDefinition(str: TypeDefinitionString): NamedTypeComposer<TContext> | void;

  public convertOutputTypeDefinition(
    typeDef: Thunk<
      | ComposeOutputTypeDefinition<any>
      | ObjectTypeComposerDefinition<any, any>
      | Readonly<Resolver<any, any>>
    >,
    fieldName?: string,
    typeName?: string
  ): ComposeOutputType<TContext> | void;

  public convertOutputFieldConfig<TSource>(
    composeFC: Thunk<
      ObjectTypeComposerFieldConfigDefinition<TSource, TContext> | Readonly<Resolver<any, TContext>>
    >,
    fieldName?: string,
    typeName?: string
  ): ObjectTypeComposerFieldConfig<TSource, TContext>;

  public convertOutputFieldConfigMap<TSource>(
    composeFields: ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext>,
    typeName?: string
  ): ObjectTypeComposerFieldConfigMap<TSource, TContext>;

  public convertArgConfig(
    composeAC: Thunk<ObjectTypeComposerArgumentConfigDefinition>,
    argName?: string,
    fieldName?: string,
    typeName?: string
  ): ObjectTypeComposerArgumentConfig;

  public convertArgConfigMap(
    composeArgsConfigMap: ObjectTypeComposerArgumentConfigMapDefinition<any>,
    fieldName?: string,
    typeName?: string
  ): ObjectTypeComposerArgumentConfigMap<any>;

  public convertInputTypeDefinition(
    typeDef: Thunk<ComposeInputTypeDefinition>,
    fieldName?: string,
    typeName?: string
  ): ComposeInputType | void;

  public convertInputFieldConfig(
    composeIFC: Thunk<InputTypeComposerFieldConfigDefinition>,
    fieldName?: string,
    typeName?: string
  ): InputTypeComposerFieldConfig;

  public convertInputFieldConfigMap(
    composeFields: InputTypeComposerFieldConfigMapDefinition,
    typeName?: string
  ): InputTypeComposerFieldConfigMap;

  public convertInterfaceTypeDefinition(
    typeDef: InterfaceTypeComposerDefinition<any, TContext>
  ): InterfaceTypeComposerThunked<any, TContext>;

  public parseTypesFromString(str: string): TypeStorage<string, NamedTypeComposer<TContext>>;

  /**
   * -----------------------------------------------
   * Internal methods
   * -----------------------------------------------
   */
}
