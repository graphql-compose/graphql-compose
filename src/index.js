/* @flow strict */

import * as graphql from './graphql';
import { SchemaComposer } from './SchemaComposer';

export { graphql };

const schemaComposer = new SchemaComposer<any>();
const sc = schemaComposer;
export {
  // SchemaComposer default global instance (alias for schemaComposer)
  sc,
  // SchemaComposer default global instance
  schemaComposer,
  // SchemaComposer class
  SchemaComposer,
};

export { TypeComposer as TypeComposerClass, isComposeOutputType } from './TypeComposer';
export {
  InputTypeComposer as InputTypeComposerClass,
  isComposeInputType,
} from './InputTypeComposer';
export { EnumTypeComposer as EnumTypeComposerClass } from './EnumTypeComposer';
export { ScalarTypeComposer as ScalarTypeComposerClass } from './ScalarTypeComposer';
export { InterfaceTypeComposer as InterfaceTypeComposerClass } from './InterfaceTypeComposer';
export { UnionTypeComposer as UnionTypeComposerClass } from './UnionTypeComposer';
export { Resolver as ResolverClass } from './Resolver';

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
  ArgsMap,
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
