/* eslint-disable no-use-before-define */
/* @flow strict */

import type { SchemaComposer } from '../SchemaComposer';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import { isNamedTypeComposer, type NamedTypeComposer } from './typeHelpers';

export type SchemaVisitor = {
  [visitKind: VisitSchemaKind]: (
    tc: NamedTypeComposer<any>,
    schemaComposer: SchemaComposer<any>
  ) => void | null | false | NamedTypeComposer<any>,
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
): VisitSchemaKind[] {
  let kinds: VisitSchemaKind[] = [];
  if (tc instanceof ObjectTypeComposer) {
    kinds = ['OBJECT_TYPE', 'COMPOSITE_TYPE', 'TYPE'];

    // add to beginning
    if (schema.Query === tc) kinds.unshift('QUERY', 'ROOT_OBJECT');
    if (schema.Mutation === tc) kinds.unshift('MUTATION', 'ROOT_OBJECT');
    if (schema.Subscription === tc) kinds.unshift('SUBSCRIPTION', 'ROOT_OBJECT');
  } else if (tc instanceof InputTypeComposer) {
    kinds = ['INPUT_OBJECT_TYPE', 'TYPE'];
  } else if (tc instanceof InterfaceTypeComposer) {
    kinds = ['INTERFACE_TYPE', 'ABSTRACT_TYPE', 'COMPOSITE_TYPE', 'TYPE'];
  } else if (tc instanceof UnionTypeComposer) {
    kinds = ['UNION_TYPE', 'ABSTRACT_TYPE', 'COMPOSITE_TYPE', 'TYPE'];
  } else if (tc instanceof ScalarTypeComposer) {
    kinds = ['SCALAR_TYPE', 'TYPE'];
  } else if (tc instanceof EnumTypeComposer) {
    kinds = ['ENUM_TYPE', 'TYPE'];
  }

  return kinds;
}

export function visitSchema(schema: SchemaComposer<any>, visitor: SchemaVisitor) {
  schema.forEach((value, key) => {
    let tc: NamedTypeComposer<any> = (value: any);
    const visitKinds = getVisitKinds(tc, schema);
    for (const kind of visitKinds) {
      if (visitor[kind]) {
        const result = visitor[kind](tc, schema);
        if (result === null) {
          // `null` - means remove type from registry
          schema.delete(key);
        } else if (result === false) {
          // `false` - halt processing other visit kinds
          break;
        } else if (isNamedTypeComposer(result)) {
          // `AnyTC` - replace type in registry
          tc = result;
          schema.set(key, tc);
        }
        // `undefined` - just move further
        // `array` - you have schema as a second arg,
        //           so you may add new types to it explicitly
      }
    }
  });
}
