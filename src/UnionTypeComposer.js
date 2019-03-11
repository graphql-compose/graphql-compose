/* @flow strict */
/* eslint-disable no-use-before-define */

// import invariant from 'graphql/jsutils/invariant';
import { GraphQLUnionType, GraphQLObjectType, GraphQLList, GraphQLNonNull } from './graphql';
import { isObject, isString, isFunction } from './utils/is';
import { inspect } from './utils/misc';
import { TypeComposer } from './TypeComposer';
import type { GraphQLResolveInfo, GraphQLTypeResolver } from './graphql';
import type { TypeAsString, ComposeObjectType } from './TypeMapper';
import type { SchemaComposer } from './SchemaComposer';
import type { Thunk } from './utils/definitions';
import type { Extensions } from './TypeComposer';
import { resolveTypeArrayAsThunk } from './utils/configAsThunk';
import { getGraphQLType, getComposeTypeName } from './utils/typeHelpers';
import { graphqlVersion } from './utils/graphqlVersion';

export type GraphQLUnionTypeExtended<TSource, TContext> = GraphQLUnionType & {
  _gqcTypeMap?: Map<string, ComposeObjectType>,
  _gqcTypeResolvers?: UnionTypeResolversMap<TSource, TContext>,
  _gqcExtensions?: Extensions,
};

export type ComposeTypesArray = Array<ComposeObjectType>;

export type UnionTypeResolversMap<TSource, TContext> = Map<
  ComposeObjectType,
  UnionTypeResolverCheckFn<TSource, TContext>
>;

type MaybePromise<+T> = Promise<T> | T;

export type UnionTypeResolverCheckFn<TSource, TContext> = (
  value: TSource,
  context: TContext,
  info: GraphQLResolveInfo
) => MaybePromise<?boolean>;

export type ComposeUnionTypeConfig<TSource, TContext> = {
  +name: string,
  +types?: Thunk<ComposeTypesArray>,
  +resolveType?: ?GraphQLTypeResolver<TSource, TContext>,
  +description?: ?string,
  +extensions?: Extensions,
};

export type UnionTypeComposerDefinition<TContext> =
  | TypeAsString
  | ComposeUnionTypeConfig<any, TContext>;

export class UnionTypeComposer<TContext> {
  gqType: GraphQLUnionTypeExtended<any, TContext>;

  static schemaComposer: SchemaComposer<TContext>;

  get schemaComposer(): SchemaComposer<TContext> {
    return this.constructor.schemaComposer;
  }

  // Also supported `GraphQLUnionType` but in such case Flowtype force developers
  // to explicitly write annotations in their code. But it's bad.
  static create(typeDef: UnionTypeComposerDefinition<TContext>): UnionTypeComposer<TContext> {
    const utc = this.createTemp(typeDef);
    this.schemaComposer.add(utc);
    return utc;
  }

  static createTemp(typeDef: UnionTypeComposerDefinition<TContext>): UnionTypeComposer<TContext> {
    if (!this.schemaComposer) {
      throw new Error('Class<UnionTypeComposer> must be created by a SchemaComposer.');
    }

    let UTC;

    if (isString(typeDef)) {
      const typeName: string = typeDef;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        UTC = new this.schemaComposer.UnionTypeComposer(
          new GraphQLUnionType({
            name: typeName,
            types: () => [],
          })
        );
      } else {
        const type = this.schemaComposer.typeMapper.createType(typeName);
        if (!(type instanceof GraphQLUnionType)) {
          throw new Error(
            'You should provide correct GraphQLUnionType type definition.' +
              'Eg. `union MyType = Photo | Person`'
          );
        }
        UTC = new this.schemaComposer.UnionTypeComposer(type);
      }
    } else if (typeDef instanceof GraphQLUnionType) {
      UTC = new this.schemaComposer.UnionTypeComposer(typeDef);
    } else if (isObject(typeDef)) {
      const types = typeDef.types;
      const type = new GraphQLUnionType({
        ...(typeDef: any),
        types: isFunction(types)
          ? () => resolveTypeArrayAsThunk(this.schemaComposer, (types(): any), typeDef.name)
          : () => [],
      });
      UTC = new this.schemaComposer.UnionTypeComposer(type);
      if (Array.isArray(types)) UTC.setTypes(types);
      UTC.gqType._gqcExtensions = typeDef.extensions || {};
    } else {
      throw new Error(
        'You should provide GraphQLUnionTypeConfig or string with union name or SDL definition'
      );
    }

    return UTC;
  }

  constructor(gqType: GraphQLUnionType) {
    if (!this.schemaComposer) {
      throw new Error('Class<UnionTypeComposer> can only be created by a SchemaComposer.');
    }

    if (!(gqType instanceof GraphQLUnionType)) {
      throw new Error('UnionTypeComposer accept only GraphQLUnionType in constructor');
    }
    this.gqType = (gqType: any);
  }

  // -----------------------------------------------
  // Union Types methods
  // -----------------------------------------------

  hasType(name: string | GraphQLObjectType | TypeComposer<TContext>): boolean {
    const nameAsString = getComposeTypeName(name);
    return this.getTypeNames().includes(nameAsString);
  }

  _getTypeMap() {
    if (!this.gqType._gqcTypeMap) {
      const types = this.gqType.getTypes();
      const m = new Map();
      types.forEach(type => {
        m.set(type.name, type);
      });
      this.gqType._gqcTypeMap = m;

      if (graphqlVersion >= 14) {
        this.gqType._types = () => {
          return resolveTypeArrayAsThunk(this.schemaComposer, this.getTypes(), this.getTypeName());
        };
      } else {
        (this.gqType: any)._types = null;
        (this.gqType: any)._typeConfig.types = () => {
          return resolveTypeArrayAsThunk(this.schemaComposer, this.getTypes(), this.getTypeName());
        };
      }
    }

    return this.gqType._gqcTypeMap;
  }

  getTypes(): ComposeTypesArray {
    return Array.from(this._getTypeMap().values());
  }

  getTypeNames(): Array<string> {
    return Array.from(this._getTypeMap().keys());
  }

  clearTypes() {
    this._getTypeMap().clear();
    return this;
  }

  setTypes(types: ComposeTypesArray): UnionTypeComposer<TContext> {
    this.clearTypes();
    types.forEach(type => {
      this._getTypeMap().set(getComposeTypeName(type), type);
    });
    return this;
  }

  addType(type: ComposeObjectType): UnionTypeComposer<TContext> {
    this._getTypeMap().set(getComposeTypeName(type), type);
    return this;
  }

  removeType(nameOrArray: string | Array<string>): UnionTypeComposer<TContext> {
    const typeNames = Array.isArray(nameOrArray) ? nameOrArray : [nameOrArray];
    typeNames.forEach(typeName => {
      this._getTypeMap().delete(typeName);
    });
    return this;
  }

  removeOtherTypes(nameOrArray: string | Array<string>): UnionTypeComposer<TContext> {
    const keepTypeNames = Array.isArray(nameOrArray) ? nameOrArray : [nameOrArray];
    this._getTypeMap().forEach((v, i) => {
      if (keepTypeNames.indexOf(i) === -1) {
        this._getTypeMap().delete(i);
      }
    });
    return this;
  }

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  getType(): GraphQLUnionType {
    return this.gqType;
  }

  getTypePlural(): GraphQLList<GraphQLUnionType> {
    return new GraphQLList(this.gqType);
  }

  getTypeNonNull(): GraphQLNonNull<GraphQLUnionType> {
    return new GraphQLNonNull(this.gqType);
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): UnionTypeComposer<TContext> {
    this.gqType.name = name;
    this.schemaComposer.add(this);
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): UnionTypeComposer<TContext> {
    this.gqType.description = description;
    return this;
  }

  clone(newTypeName: string): UnionTypeComposer<TContext> {
    if (!newTypeName) {
      throw new Error('You should provide newTypeName:string for UnionTypeComposer.clone()');
    }

    const cloned = this.schemaComposer.UnionTypeComposer.create(newTypeName);
    cloned.setTypes(this.getTypes());
    cloned.setDescription(this.getDescription());

    return cloned;
  }

  // -----------------------------------------------
  // ResolveType methods
  // -----------------------------------------------

  getResolveType(): ?GraphQLTypeResolver<any, TContext> {
    return (this.gqType.resolveType: any);
  }

  setResolveType(fn: ?GraphQLTypeResolver<any, TContext>): UnionTypeComposer<TContext> {
    this.gqType.resolveType = fn;
    return this;
  }

  hasTypeResolver(type: TypeComposer<TContext> | GraphQLObjectType): boolean {
    const typeResolversMap = this.getTypeResolvers();
    return typeResolversMap.has(type);
  }

  getTypeResolvers(): UnionTypeResolversMap<any, TContext> {
    if (!this.gqType._gqcTypeResolvers) {
      this.gqType._gqcTypeResolvers = new Map();
    }
    return this.gqType._gqcTypeResolvers;
  }

  getTypeResolverCheckFn(
    type: TypeComposer<TContext> | GraphQLObjectType
  ): UnionTypeResolverCheckFn<any, TContext> {
    const typeResolversMap = this.getTypeResolvers();

    if (!typeResolversMap.has(type)) {
      throw new Error(
        `Type resolve function in union '${this.getTypeName()}' is not defined for type ${inspect(
          type
        )}.`
      );
    }

    return (typeResolversMap.get(type): any);
  }

  getTypeResolverNames(): string[] {
    const typeResolversMap = this.getTypeResolvers();
    const names = [];
    typeResolversMap.forEach((resolveFn, composeType) => {
      if (composeType instanceof TypeComposer) {
        names.push(composeType.getTypeName());
      } else if (composeType && typeof composeType.name === 'string') {
        names.push(composeType.name);
      }
    });
    return names;
  }

  getTypeResolverTypes(): GraphQLObjectType[] {
    const typeResolversMap = this.getTypeResolvers();
    const types = [];
    typeResolversMap.forEach((resolveFn, composeType) => {
      types.push(((getGraphQLType(composeType): any): GraphQLObjectType));
    });
    return types;
  }

  setTypeResolvers(
    typeResolversMap: UnionTypeResolversMap<any, TContext>
  ): UnionTypeComposer<TContext> {
    this._isTypeResolversValid(typeResolversMap);

    this.gqType._gqcTypeResolvers = typeResolversMap;

    // extract GraphQLObjectType from TypeComposer
    const fastEntries = [];
    for (const [composeType, checkFn] of typeResolversMap.entries()) {
      fastEntries.push([((getGraphQLType(composeType): any): GraphQLObjectType), checkFn]);
      this.addType(composeType);
    }

    let resolveType;
    const isAsyncRuntime = this._isTypeResolversAsync(typeResolversMap);
    if (isAsyncRuntime) {
      resolveType = async (value, context, info) => {
        for (const [gqType, checkFn] of fastEntries) {
          // should we run checkFn simultaniously or in serial?
          // Current decision is: dont SPIKE event loop - run in serial (it may be changed in future)
          // eslint-disable-next-line no-await-in-loop
          if (await checkFn(value, context, info)) return gqType;
        }
        return null;
      };
    } else {
      resolveType = (value, context, info) => {
        for (const [gqType, checkFn] of fastEntries) {
          if (checkFn(value, context, info)) return gqType;
        }
        return null;
      };
    }

    this.setResolveType(resolveType);
    return this;
  }

  _isTypeResolversValid(typeResolversMap: UnionTypeResolversMap<any, TContext>): true {
    if (!(typeResolversMap instanceof Map)) {
      throw new Error(
        `For union ${this.getTypeName()} you should provide Map object for type resolvers.`
      );
    }

    for (const [composeType, checkFn] of typeResolversMap.entries()) {
      // checking composeType
      try {
        const type = getGraphQLType(composeType);
        if (!(type instanceof GraphQLObjectType)) throw new Error('Must be GraphQLObjectType');
      } catch (e) {
        throw new Error(
          `For union type resolver ${this.getTypeName()} you must provide GraphQLObjectType or TypeComposer, but provided ${inspect(
            composeType
          )}`
        );
      }

      // checking checkFn
      if (!isFunction(checkFn)) {
        throw new Error(
          `Union ${this.getTypeName()} has invalid check function for type ${inspect(composeType)}`
        );
      }
    }

    return true;
  }

  // eslint-disable-next-line class-methods-use-this
  _isTypeResolversAsync(typeResolversMap: UnionTypeResolversMap<any, TContext>): boolean {
    let res = false;
    for (const [, checkFn] of typeResolversMap.entries()) {
      try {
        const r = checkFn(({}: any), ({}: any), ({}: any));
        if (r instanceof Promise) {
          r.catch(() => {});
          res = true;
        }
      } catch (e) {
        // noop
      }
    }
    return res;
  }

  addTypeResolver(
    type: TypeComposer<TContext> | GraphQLObjectType,
    checkFn: UnionTypeResolverCheckFn<any, TContext>
  ): UnionTypeComposer<TContext> {
    const typeResolversMap = this.getTypeResolvers();
    typeResolversMap.set(type, checkFn);
    this.setTypeResolvers(typeResolversMap);
    return this;
  }

  removeTypeResolver(
    type: TypeComposer<TContext> | GraphQLObjectType
  ): UnionTypeComposer<TContext> {
    const typeResolversMap = this.getTypeResolvers();
    typeResolversMap.delete(type);
    this.setTypeResolvers(typeResolversMap);
    return this;
  }

  // -----------------------------------------------
  // Extensions methods
  // -----------------------------------------------

  getExtensions(): Extensions {
    if (!this.gqType._gqcExtensions) {
      return {};
    } else {
      return this.gqType._gqcExtensions;
    }
  }

  setExtensions(extensions: Extensions): UnionTypeComposer<TContext> {
    this.gqType._gqcExtensions = extensions;
    return this;
  }

  extendExtensions(extensions: Extensions): UnionTypeComposer<TContext> {
    const current = this.getExtensions();
    this.setExtensions({
      ...current,
      ...extensions,
    });
    return this;
  }

  clearExtensions(): UnionTypeComposer<TContext> {
    this.setExtensions({});
    return this;
  }

  getExtension(extensionName: string): ?any {
    const extensions = this.getExtensions();
    return extensions[extensionName];
  }

  hasExtension(extensionName: string): boolean {
    const extensions = this.getExtensions();
    return extensionName in extensions;
  }

  setExtension(extensionName: string, value: any): UnionTypeComposer<TContext> {
    this.extendExtensions({
      [extensionName]: value,
    });
    return this;
  }

  removeExtension(extensionName: string): UnionTypeComposer<TContext> {
    const extensions = { ...this.getExtensions() };
    delete extensions[extensionName];
    this.setExtensions(extensions);
    return this;
  }

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  // get(path: string | Array<string>): any {
  //   return typeByPath(this, path);
  // }
}
