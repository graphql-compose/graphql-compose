import { BUILT_IN_DIRECTIVES, SchemaComposer } from '../SchemaComposer';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import type { NamedTypeComposer } from './typeHelpers';

export type SchemaFilterTypes = {
  include?: string[];
  exclude?: string[];
  omitDirectiveDefinitions?: boolean;
};

export function getTypesFromSchema(
  sc: SchemaComposer<any>,
  filter?: SchemaFilterTypes
): Set<NamedTypeComposer<any>> {
  const { exclude = [], include, omitDirectiveDefinitions } = filter || {};

  const rootTypes = new Set();
  if (Array.isArray(include) && include.length) {
    include.forEach((s) => {
      if (s && typeof s === 'string') {
        rootTypes.add(sc.getAnyTC(s));
      }
    });
  } else {
    if (sc.has('Query')) rootTypes.add(sc.getOTC('Query'));
    if (sc.has('Mutation')) rootTypes.add(sc.getOTC('Mutation'));
    if (sc.has('Subscription')) rootTypes.add(sc.getOTC('Subscription'));
  }

  if (!omitDirectiveDefinitions) {
    const directives = sc._directives.filter((d) => !BUILT_IN_DIRECTIVES.includes(d));
    // directives may have specific types in arguments, so add them to rootTypes
    directives.forEach((d) => {
      if (!Array.isArray(d.args)) return;
      d.args.forEach((ac: any) => {
        const tc = sc.getAnyTC(ac.type);
        if (!exclude.includes(tc.getTypeName())) {
          rootTypes.add(tc);
        }
      });
    });
  }

  const typeSet: Set<NamedTypeComposer<any>> = new Set();
  rootTypes.forEach((tc) => {
    if (
      tc instanceof ObjectTypeComposer ||
      tc instanceof InputTypeComposer ||
      tc instanceof InterfaceTypeComposer ||
      tc instanceof UnionTypeComposer
    ) {
      typeSet.add(tc);
      tc.getNestedTCs({ exclude }, typeSet);
    } else {
      typeSet.add(tc as any);
    }
  });
  return typeSet;
}

export function getDirectivesFromSchema(sc: SchemaComposer<any>): any[] {
  return sc._directives.filter((d) => !BUILT_IN_DIRECTIVES.includes(d));
}
