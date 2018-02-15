/* @flow strict */

import * as graphql from './graphql';
import { SchemaComposer } from './SchemaComposer';

export { graphql };

const schemaComposer: SchemaComposer<any> = new SchemaComposer();
const GQC = schemaComposer;
const TypeComposer = GQC.TypeComposer;
const InputTypeComposer = GQC.InputTypeComposer;
const EnumTypeComposer = GQC.EnumTypeComposer;
const Resolver = GQC.Resolver;
const TypeMapper = GQC.typeMapper;
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

// Export Composers' prototype classes for instance check in plugins
export { TypeComposer as _ProtoTypeComposer } from './TypeComposer';
export { InputTypeComposer as _ProtoInputTypeComposer } from './InputTypeComposer';
export { EnumTypeComposer as _ProtoEnumTypeComposer } from './EnumTypeComposer';
export { Resolver as _ProtoResolver } from './Resolver';
export { TypeMapper as _ProtoTypeMapper } from './TypeMapper';

export { TypeStorage } from './TypeStorage';
export { getProjectionFromAST, getFlatProjectionFromAST } from './utils/projection';

export { GraphQLDate, GraphQLBuffer, GraphQLGeneric, GraphQLJSON } from './type';

export { toInputObjectType, convertInputObjectFieldOpts } from './utils/toInputObjectType';

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

export {
  ComposeInputType,
  ComposeInputFieldConfig,
  ComposeInputFieldConfigAsObject,
  ComposeInputFieldConfigMap,
  ComposeInputObjectTypeConfig,
} from './InputTypeComposer';

export {
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

export { ProjectionType, ProjectionNode } from './utils/projection';

export type { TypeDefinitionString, TypeWrappedString, TypeNameString } from './TypeMapper';
