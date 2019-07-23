import { SchemaComposer } from '../SchemaComposer';
import { NamedTypeComposer } from './typeHelpers';

export type TypeKind = {};

export type SchemaVisitor = {
  [visitKind in VisitSchemaKind]: (
    tc: NamedTypeComposer<any>,
    schemaComposer: SchemaComposer<any>
  ) => void | null | false | NamedTypeComposer<any>;
};

export type VisitSchemaKind =
  | 'TYPE'
  | 'SCALAR_TYPE'
  | 'ENUM_TYPE'
  | 'COMPOSITE_TYPE'
  | 'OBJECT_TYPE'
  | 'INPUT_OBJECT_TYPE'
  | 'ABSTRACT_TYPE'
  | 'UNION_TYPE'
  | 'INTERFACE_TYPE'
  | 'ROOT_OBJECT'
  | 'QUERY'
  | 'MUTATION'
  | 'SUBSCRIPTION';

/**
 * Get visit kinds for provided type.
 * Returns array of kind from specific to common.
 * Cause first visit operation may halt other visit calls.
 */
export function getVisitKinds(
  tc: NamedTypeComposer<any>,
  schema: SchemaComposer<any>
): VisitSchemaKind[];

export function visitSchema(schema: SchemaComposer<any>, visitor: SchemaVisitor): void;
