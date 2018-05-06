/* @flow strict */

import * as graphql from './graphql';
import { SchemaComposer } from './SchemaComposer';

export { graphql };

const schemaComposer: SchemaComposer<any> = new SchemaComposer();
const GQC = schemaComposer;
const TypeComposer = schemaComposer.TypeComposer;
const InputTypeComposer = schemaComposer.InputTypeComposer;
const EnumTypeComposer = schemaComposer.EnumTypeComposer;
const Resolver = schemaComposer.Resolver;
const TypeMapper = schemaComposer.typeMapper;
export {
  // SchemaComposer default global instance (alias for schemaComposer)
  GQC,
  // SchemaComposer default global instance
  schemaComposer,
  // SchemaComposer class
  SchemaComposer,
  TypeComposer,
  InputTypeComposer,
  EnumTypeComposer,
  Resolver,
  TypeMapper,
};

export { TypeStorage } from './TypeStorage';

// Scalar types
export { GraphQLDate, GraphQLBuffer, GraphQLGeneric, GraphQLJSON } from './type';

// Utils
export { getProjectionFromAST, getFlatProjectionFromAST } from './utils/projection';
export { toInputObjectType, convertInputObjectField } from './utils/toInputObjectType';
export * from './utils/misc';
export * from './utils/is';
export * from './utils/graphqlVersion';
export { default as toDottedObject } from './utils/toDottedObject';
export { default as deepmerge } from './utils/deepmerge';
export { default as filterByDotPaths } from './utils/filterByDotPaths';

export type {
  GetRecordIdFn,
  GraphQLObjectTypeExtended,
  ComposeObjectTypeConfig,
  ComposeOutputType,
  ComposeFieldConfig,
  ComposeFieldConfigAsObject,
  ComposeFieldConfigMap,
  ComposeArgumentType,
  ComposeArgumentConfig,
  ComposeArgumentConfigAsObject,
  ComposeFieldConfigArgumentMap,
  RelationThunkMap,
  RelationOpts,
  RelationOptsWithResolver,
  RelationOptsWithFieldConfig,
  ArgsType,
  RelationArgsMapperFn,
  RelationArgsMapper,
} from './TypeComposer';

export type {
  ComposeInputType,
  ComposeInputFieldConfig,
  ComposeInputFieldConfigAsObject,
  ComposeInputFieldConfigMap,
  ComposeInputObjectTypeConfig,
} from './InputTypeComposer';

export type {
  ResolveParams,
  ResolverKinds,
  ResolverFilterArgFn,
  ResolverFilterArgConfig,
  ResolverSortArgFn,
  ResolverSortArgConfig,
  ResolverOpts,
  ResolverWrapCb,
  ResolverRpCb,
  ResolverNextRpCb,
  ResolverWrapArgsCb,
  ResolverWrapTypeCb,
  ResolveDebugOpts,
} from './Resolver';

export type { ProjectionType, ProjectionNode } from './utils/projection';

export type { TypeDefinitionString, TypeWrappedString, TypeNameString } from './TypeMapper';
