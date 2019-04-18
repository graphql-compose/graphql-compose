import { isComposeType, AnyComposeType, SchemaComposer } from '../SchemaComposer';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';

export type TypeKind = {};

export type SchemaVisitor = {
  [visitKind in VisitSchemaKind]: (
    tc: AnyComposeType<any>,
    schemaComposer: SchemaComposer<any>
  ) => void | null | false | AnyComposeType<any>
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
  tc: AnyComposeType<any>,
  schema: SchemaComposer<any>
): VisitSchemaKind[];

export function visitSchema(schema: SchemaComposer<any>, visitor: SchemaVisitor): void;
