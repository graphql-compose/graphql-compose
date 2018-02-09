/* @flow */

import * as graphql from './graphql';
import { SchemaComposer } from './schemaComposer';

export { graphql };

const GQC: SchemaComposer<*> = new SchemaComposer();
const TypeComposer = GQC.TypeComposer;
const InputTypeComposer = GQC.InputTypeComposer;
const EnumTypeComposer = GQC.EnumTypeComposer;
const Resolver = GQC.Resolver;
const TypeMapper = GQC.TypeMapper;
export {
  GQC,
  SchemaComposer,
  TypeComposer,
  InputTypeComposer,
  EnumTypeComposer,
  Resolver,
  TypeMapper,
};

// Export Composers' prototype classes for instance check in plugins
export { TypeComposer as _ProtoTypeComposer } from './typeComposer';
export { InputTypeComposer as _ProtoInputTypeComposer } from './inputTypeComposer';
export { EnumTypeComposer as _ProtoEnumTypeComposer } from './enumTypeComposer';
export { Resolver as _ProtoResolver } from './resolver';
export { TypeMapper as _ProtoTypeMapper } from './typeMapper';

export { TypeStorage } from './typeStorage';
export { getProjectionFromAST, getFlatProjectionFromAST } from './projection';

export { GraphQLDate, GraphQLBuffer, GraphQLGeneric, GraphQLJSON } from './type';

export { toInputObjectType, convertInputObjectFieldOpts } from './toInputObjectType';

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
} from './typeComposer';

export {
  ComposeInputType,
  ComposeInputFieldConfig,
  ComposeInputFieldConfigAsObject,
  ComposeInputFieldConfigMap,
  ComposeInputObjectTypeConfig,
} from './inputTypeComposer';

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
} from './resolver';

export { ProjectionType, ProjectionNode } from './projection';

export type { TypeDefinitionString, TypeWrappedString, TypeNameString } from './typeMapper';
