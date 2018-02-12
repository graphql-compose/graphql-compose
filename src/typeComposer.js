/* @flow strict */
/* eslint-disable no-use-before-define */

import { resolveMaybeThunk } from './utils/misc';
import { isObject, isFunction, isString } from './utils/is';
import { resolveOutputConfigsAsThunk } from './utils/configAsThunk';
import { deprecate } from './utils/debug';
import { toInputObjectType } from './toInputObjectType';
import { type InputTypeComposer } from './inputTypeComposer';
import { type EnumTypeComposer } from './enumTypeComposer';
import { typeByPath } from './typeByPath';
import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  getNamedType,
} from './graphql';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  GraphQLIsTypeOfFn,
  GraphQLResolveInfo,
  GraphQLFieldResolver,
} from './graphql';
import type { TypeAsString } from './typeMapper';
import type { Resolver, ResolverOpts, ResolverNextRpCb, ResolverWrapCb } from './resolver';
import type { ProjectionType } from './projection';
import type { GenericMap, ObjMap, Thunk } from './utils/definitions';
import type { SchemaComposer } from './schemaComposer';

export type GetRecordIdFn<TSource, TContext> = (
  source: TSource,
  args: ?mixed,
  context: TContext
) => string;

export type GraphQLObjectTypeExtended = GraphQLObjectType & {
  _gqcInputTypeComposer?: InputTypeComposer,
  _gqcResolvers?: Map<string, Resolver<any, any>>,
  _gqcGetRecordIdFn?: GetRecordIdFn<any, any>,
  _gqcRelations?: RelationThunkMap<any, any>,
  description?: ?string,
};

export type ComposeObjectTypeConfig<TSource, TContext> = {
  name: string,
  interfaces?: Thunk<?Array<GraphQLInterfaceType>>,
  fields?: Thunk<ComposeFieldConfigMap<TSource, TContext>>,
  isTypeOf?: ?GraphQLIsTypeOfFn<TSource, TContext>,
  description?: ?string,
  isIntrospection?: boolean,
};

// extended GraphQLFieldConfigMap
export type ComposeFieldConfigMap<TSource, TContext> = ObjMap<
  ComposeFieldConfig<TSource, TContext>
>;

export type ComposeFieldConfig<TSource, TContext> =
  | ComposeFieldConfigAsObject<TSource, TContext>
  | ComposeOutputType<TContext>
  | (() => ComposeFieldConfigAsObject<TSource, TContext> | ComposeOutputType<TContext>);

// extended GraphQLFieldConfig
export type GraphqlFieldConfigExtended<TSource, TContext> = GraphQLFieldConfig<
  TSource,
  TContext
> & { projection?: any };

export type ComposeFieldConfigAsObject<TSource, TContext> = {
  type: Thunk<ComposeOutputType<TContext>> | GraphQLOutputType,
  args?: ComposeFieldConfigArgumentMap,
  resolve?: GraphQLFieldResolver<TSource, TContext>,
  subscribe?: GraphQLFieldResolver<TSource, TContext>,
  deprecationReason?: ?string,
  description?: ?string,
  astNode?: any,
  [key: string]: any,
} & { $call?: void };

// extended GraphQLOutputType
export type ComposeOutputType<TContext> =
  | GraphQLOutputType
  | TypeComposer<TContext>
  | EnumTypeComposer
  | TypeAsString
  | Resolver<any, TContext>
  | Array<ComposeOutputType<TContext>>;

// Compose Args -----------------------------
export type ComposeArgumentType =
  | GraphQLInputType
  | TypeAsString
  | InputTypeComposer
  | EnumTypeComposer
  | Array<ComposeArgumentType>;
export type ComposeArgumentConfigAsObject = {
  type: Thunk<ComposeArgumentType> | GraphQLInputType,
  defaultValue?: mixed,
  description?: ?string,
  astNode?: any,
} & { $call?: void };
export type ComposeArgumentConfig =
  | ComposeArgumentConfigAsObject
  | ComposeArgumentType
  | (() => ComposeArgumentConfigAsObject | ComposeArgumentType);
export type ComposeFieldConfigArgumentMap = ObjMap<ComposeArgumentConfig>;

// RELATION -----------------------------
export type RelationThunkMap<TSource, TContext> = {
  [fieldName: string]: Thunk<RelationOpts<TSource, TContext>>,
};
export type RelationOpts<TSource, TContext> =
  | RelationOptsWithResolver<TSource, TContext>
  | RelationOptsWithFieldConfig<TSource, TContext>;
export type RelationOptsWithResolver<TSource, TContext> = {
  resolver: Thunk<Resolver<TSource, TContext>>,
  prepareArgs?: RelationArgsMapper<TSource, TContext>,
  projection?: ProjectionType,
  description?: ?string,
  deprecationReason?: ?string,
  catchErrors?: boolean,
};
export type RelationOptsWithFieldConfig<TSource, TContext> = ComposeFieldConfigAsObject<
  TSource,
  TContext
> & { resolve: GraphQLFieldResolver<TSource, TContext> };
export type ArgsType = { [argName: string]: any };
export type RelationArgsMapperFn<TSource, TContext> = (
  source: TSource,
  args: ArgsType,
  context: TContext,
  info: GraphQLResolveInfo
) => any;
export type RelationArgsMapper<TSource, TContext> = {
  [argName: string]:
    | RelationArgsMapperFn<TSource, TContext>
    | null
    | void
    | string
    | number
    | Array<any>
    | GenericMap<any>,
};

export class TypeComposer<TContext = any> {
  gqType: GraphQLObjectTypeExtended;
  _fields: GraphQLFieldConfigMap<any, TContext>;
  static schemaComposer: SchemaComposer<TContext>;

  static create(
    opts: TypeAsString | ComposeObjectTypeConfig<any, TContext> | GraphQLObjectType
  ): TypeComposer<TContext> {
    if (!this.schemaComposer) {
      throw new Error('Class<TypeComposer> must be created by a SchemaComposer.');
    }

    let TC;

    if (isString(opts)) {
      const typeName: string = opts;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        TC = new this.schemaComposer.TypeComposer(
          new GraphQLObjectType({
            name: typeName,
            fields: () => ({}),
          })
        );
      } else {
        const type = this.schemaComposer.typeMapper.createType(typeName);
        if (!(type instanceof GraphQLObjectType)) {
          throw new Error(
            'You should provide correct GraphQLObjectType type definition.' +
              'Eg. `type MyType { name: String }`'
          );
        }
        TC = new this.schemaComposer.TypeComposer(type);
      }
    } else if (opts instanceof GraphQLObjectType) {
      TC = new this.schemaComposer.TypeComposer(opts);
    } else if (isObject(opts)) {
      const type = new GraphQLObjectType({
        ...(opts: any),
        fields: () => ({}),
      });
      TC = new this.schemaComposer.TypeComposer(type);

      if (isObject(opts.fields)) {
        TC.addFields(opts.fields);
      }
    } else {
      throw new Error(
        'You should provide GraphQLObjectTypeConfig or string with type name to TypeComposer.create(opts)'
      );
    }

    return TC;
  }

  constructor(gqType: GraphQLObjectType): TypeComposer<TContext> {
    if (!this.constructor.schemaComposer) {
      throw new Error('Class<TypeComposer> can only be created by a SchemaComposer.');
    }

    if (!(gqType instanceof GraphQLObjectType)) {
      throw new Error('TypeComposer accept only GraphQLObjectType in constructor');
    }
    this.gqType = gqType;

    // alive proper Flow type casting in autosuggestions
    /* :: return this; */
  }

  /**
   * Get fields from a GraphQL type
   * WARNING: this method read an internal GraphQL instance variable.
   *
   * TODO: should return GraphQLFieldConfigMap<any, any>
   * BUT if setFields(fields: ComposeFieldConfigMap<any, any> | GraphQLFieldConfigMap<any, any>)
   * then flow producess error with such common case TC.setFields(TC.getFields())
   * with following message "Could not decide which case to select"
   * More info about solution
   *  https://twitter.com/nodkz/status/925010361815851008
   *  https://github.com/facebook/flow/issues/2892
   */
  getFields(): ObjMap<any> {
    if (!this._fields) {
      const fields: Thunk<GraphQLFieldConfigMap<any, any>> = this.gqType._typeConfig.fields;
      this._fields = resolveMaybeThunk(fields) || {};
    }

    return this._fields;
  }

  getFieldNames(): string[] {
    return Object.keys(this.getFields());
  }

  /**
   * Completely replace all fields in GraphQL type
   * WARNING: this method rewrite an internal GraphQL instance properties.
   */
  setFields(fields: ComposeFieldConfigMap<any, TContext>): TypeComposer<TContext> {
    const prepearedFields: GraphQLFieldConfigMap<
      any,
      TContext
    > = this.constructor.schemaComposer.typeMapper.convertOutputFieldConfigMap(
      fields,
      this.getTypeName()
    );

    this._fields = prepearedFields;
    this.gqType._typeConfig.fields = () =>
      resolveOutputConfigsAsThunk(
        this.constructor.schemaComposer,
        prepearedFields,
        this.getTypeName()
      );
    delete this.gqType._fields; // clear builded fields in type
    return this;
  }

  hasField(fieldName: string): boolean {
    const fields = this.getFields();
    return !!fields[fieldName];
  }

  setField(
    fieldName: string,
    fieldConfig: ComposeFieldConfig<any, TContext>
  ): TypeComposer<TContext> {
    this.addFields({ [fieldName]: fieldConfig });

    return this;
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newFields: ComposeFieldConfigMap<any, TContext>): TypeComposer<TContext> {
    this.setFields({ ...this.getFields(), ...newFields });
    return this;
  }

  /**
   * Get fieldConfig by name
   * TODO should be GraphQLFieldConfig<any, any>
   * see getFields() method for details
   */
  getField(fieldName: string): any {
    const fields = this.getFields();

    if (!fields[fieldName]) {
      throw new Error(
        `Cannot get field '${fieldName}' from type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    return fields[fieldName];
  }

  removeField(fieldNameOrArray: string | Array<string>): TypeComposer<TContext> {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach(fieldName => delete fields[fieldName]);
    this.setFields({ ...fields });
    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): TypeComposer<TContext> {
    const keepFieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    Object.keys(fields).forEach(fieldName => {
      if (keepFieldNames.indexOf(fieldName) === -1) {
        delete fields[fieldName];
      }
    });
    this.setFields(fields);
    return this;
  }

  extendField(
    fieldName: string,
    parialFieldConfig: $Shape<ComposeFieldConfigAsObject<any, TContext>>
  ): TypeComposer<TContext> {
    let prevFieldConfig;
    try {
      prevFieldConfig = this.getField(fieldName);
    } catch (e) {
      throw new Error(
        `Cannot extend field '${fieldName}' from type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    if (isFunction(prevFieldConfig)) {
      throw new Error(
        `Cannot extend field '${fieldName}' from type '${this.getTypeName()}'. ` +
          'FieldConfig declared as a function. ' +
          'Such declaration helps to solve hoisting problems between two types which import each other'
      );
    }

    const fieldConfig: ComposeFieldConfigAsObject<any, TContext> = {
      ...(prevFieldConfig: any),
      ...(parialFieldConfig: any),
    };
    this.setField(fieldName, fieldConfig);
    return this;
  }

  reorderFields(names: string[]): TypeComposer<TContext> {
    const orderedFields = {};
    const fields = this.getFields();
    names.forEach(name => {
      if (fields[name]) {
        orderedFields[name] = fields[name];
        delete fields[name];
      }
    });
    this.setFields({ ...orderedFields, ...fields });
    return this;
  }

  addRelation<TSource>(
    fieldName: string,
    opts: RelationOpts<TSource, TContext>
  ): TypeComposer<TContext> {
    let relationOpts;

    if (!this.gqType._gqcRelations) {
      this.gqType._gqcRelations = {};
    }
    this.gqType._gqcRelations[fieldName] = opts;

    // @deprecate remove this check in 3.0.0
    if (isFunction(opts)) {
      deprecate(
        `${this.getTypeName()}.addRelation('${fieldName}', opts). \n` +
          'Argument `opts` cannot be a function from v2.0.0. See https://github.com/nodkz/graphql-compose/releases/tag/2.0.0 \n' +
          'Please change `() => ({ resolver: Resolver, ... })` on `{ resolver: () => Resolver, ... }`'
      );
      relationOpts = opts();
    } else {
      relationOpts = opts;
    }

    if (relationOpts.hasOwnProperty('resolver')) {
      this.setField(fieldName, () => {
        return this._relationWithResolverToFC(relationOpts, fieldName);
      });
    } else if (relationOpts.hasOwnProperty('type')) {
      const fc: RelationOptsWithFieldConfig<TSource, TContext> = (relationOpts: any);
      this.setField(fieldName, fc); // was: () => fc
    }

    return this;
  }

  getRelations(): RelationThunkMap<any, TContext> {
    if (!this.gqType._gqcRelations) {
      this.gqType._gqcRelations = {};
    }
    return this.gqType._gqcRelations;
  }

  /**
   * @deprecated 3.0.0
   */
  buildRelations(): TypeComposer<TContext> {
    deprecate('No need in calling TC.buildRelations(). You may safely remove call of this method.');
    return this;
  }

  /**
   * @deprecated 3.0.0
   */
  buildRelation(): TypeComposer<TContext> {
    deprecate('No need in calling TC.buildRelation(). You may safely remove call of this method.');
    return this;
  }

  _relationWithResolverToFC<TSource>(
    opts: RelationOptsWithResolver<TSource, TContext>,
    fieldName?: string = ''
  ): ComposeFieldConfigAsObject<TSource, TContext> {
    const resolver = isFunction(opts.resolver) ? opts.resolver() : opts.resolver;

    if (!(resolver instanceof this.constructor.schemaComposer.Resolver)) {
      throw new Error(
        'You should provide correct Resolver object for relation ' +
          `${this.getTypeName()}.${fieldName}`
      );
    }
    if (opts.type) {
      throw new Error(
        'You can not use `resolver` and `type` properties simultaneously for relation ' +
          `${this.getTypeName()}.${fieldName}`
      );
    }
    if (opts.resolve) {
      throw new Error(
        'You can not use `resolver` and `resolve` properties simultaneously for relation ' +
          `${this.getTypeName()}.${fieldName}`
      );
    }

    const fieldConfig = resolver.getFieldConfig();
    const argsConfig = { ...fieldConfig.args };
    const argsProto = {};
    const argsRuntime: [string, RelationArgsMapperFn<TSource, TContext>][] = [];

    // remove args from config, if arg name provided in args
    //    if `argMapVal`
    //       is `undefined`, then keep arg field in config
    //       is `null`, then just remove arg field from config
    //       is `function`, then remove arg field and run it in resolve
    //       is any other value, then put it to args prototype for resolve
    let optsArgs = opts.prepareArgs || {};

    /*
    * It's done for better naming. Cause `args` name should be reserver under GraphQLArgConfigMap
    * In terms of graphql-compose `args` is map of preparation functions, so better name is `prepareArgs`
    * @deprecated 3.0.0
    */
    if (opts.args) {
      optsArgs = ((opts.args: any): RelationArgsMapper<TSource, TContext>);
      deprecate(
        `Please rename 'args' option to 'prepareArgs' in type '${this.getTypeName()}' ` +
          `in method call addRelation('${fieldName}', { /* rename option 'args' to 'prepareArgs' */ }).`
      );
    }
    Object.keys(optsArgs).forEach(argName => {
      const argMapVal = optsArgs[argName];
      if (argMapVal !== undefined) {
        delete argsConfig[argName];

        if (isFunction(argMapVal)) {
          argsRuntime.push([argName, argMapVal]);
        } else if (argMapVal !== null) {
          argsProto[argName] = argMapVal;
        }
      }
    });

    // if opts.catchErrors is undefined then set true, otherwise take it value
    const { catchErrors = true } = opts;

    const resolve = (source, args, context, info) => {
      const newArgs = { ...args, ...argsProto };
      argsRuntime.forEach(([argName, argFn]) => {
        newArgs[argName] = argFn(source, args, context, info);
      });

      const payload = fieldConfig.resolve
        ? fieldConfig.resolve(source, newArgs, context, info)
        : null;
      return catchErrors
        ? Promise.resolve(payload).catch(e => {
            // eslint-disable-next-line
            console.log(`GQC ERROR: relation for ${this.getTypeName()}.${fieldName} throws error:`);
            console.log(e); // eslint-disable-line
            return null;
          })
        : payload;
    };

    return {
      type: fieldConfig.type,
      description: opts.description,
      deprecationReason: opts.deprecationReason,
      args: argsConfig,
      resolve,
      projection: opts.projection,
    };
  }

  /**
   * Get fields from a GraphQL type
   * WARNING: this method read an internal GraphQL instance variable.
   */
  getInterfaces(): Array<GraphQLInterfaceType> {
    const interfaces: Array<GraphQLInterfaceType> | Thunk<?Array<GraphQLInterfaceType>> = this
      .gqType._typeConfig.interfaces;

    if (typeof interfaces === 'function') {
      return interfaces() || [];
    }

    return interfaces || [];
  }

  /**
   * Completely replace all interfaces in GraphQL type
   * WARNING: this method rewrite an internal GraphQL instance variable.
   */
  setInterfaces(interfaces: Array<GraphQLInterfaceType>): TypeComposer<TContext> {
    this.gqType._typeConfig.interfaces = interfaces;
    delete this.gqType._interfaces; // if schema was builded, delete _interfaces
    return this;
  }

  hasInterface(interfaceObj: GraphQLInterfaceType): boolean {
    return this.getInterfaces().indexOf(interfaceObj) > -1;
  }

  addInterface(interfaceObj: GraphQLInterfaceType): TypeComposer<TContext> {
    if (!this.hasInterface(interfaceObj)) {
      this.setInterfaces([...this.getInterfaces(), interfaceObj]);
    }
    return this;
  }

  removeInterface(interfaceObj: GraphQLInterfaceType): TypeComposer<TContext> {
    const interfaces = this.getInterfaces();
    const idx = interfaces.indexOf(interfaceObj);
    if (idx > -1) {
      interfaces.splice(idx, 1);
      this.setInterfaces(interfaces);
    }
    return this;
  }

  clone(newTypeName: string): TypeComposer<TContext> {
    if (!newTypeName) {
      throw new Error('You should provide newTypeName:string for TypeComposer.clone()');
    }

    const fields = this.getFields();
    const newFields = {};
    Object.keys(fields).forEach(fieldName => {
      newFields[fieldName] = { ...fields[fieldName] };
    });

    const cloned = new this.constructor.schemaComposer.TypeComposer(
      new GraphQLObjectType({
        name: newTypeName,
        fields: newFields,
      })
    );

    cloned.setDescription(this.getDescription());
    try {
      cloned.setRecordIdFn(this.getRecordIdFn());
    } catch (e) {
      // no problem, clone without resolveIdFn
    }
    this.getResolvers().forEach(resolver => {
      const newResolver = resolver.clone(cloned);
      cloned.addResolver(newResolver);
    });

    return cloned;
  }

  /**
   * Get fieldType by name
   */
  getFieldType(fieldName: string): GraphQLOutputType {
    const field = this.getField(fieldName);
    if (!field) {
      throw new Error(`Type ${this.getTypeName()} does not have field with name '${fieldName}'`);
    }

    return field.type;
  }

  getFieldTC(fieldName: string): TypeComposer<TContext> {
    const fieldType = getNamedType(this.getFieldType(fieldName));
    if (!(fieldType instanceof GraphQLObjectType)) {
      throw new Error(
        `Cannot get TypeComposer for field '${fieldName}' in type ${this.getTypeName()}. ` +
          `This field should be ObjectType, but it has type '${fieldType.constructor.name}'`
      );
    }
    return this.constructor.schemaComposer.TypeComposer.create(fieldType);
  }

  makeFieldNonNull(fieldNameOrArray: string | Array<string>): TypeComposer<TContext> {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach(fieldName => {
      if (fields[fieldName] && fields[fieldName].type) {
        if (!(fields[fieldName].type instanceof GraphQLNonNull)) {
          fields[fieldName].type = new GraphQLNonNull(fields[fieldName].type);
        }
      }
    });
    this.setFields(fields);
    return this;
  }

  makeFieldNullable(fieldNameOrArray: string | Array<string>): TypeComposer<TContext> {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach(fieldName => {
      if (fieldNames.indexOf(fieldName) > -1) {
        if (fields[fieldName] && fields[fieldName].type instanceof GraphQLNonNull) {
          fields[fieldName].type = fields[fieldName].type.ofType;
        }
      }
    });
    this.setFields(fields);
    return this;
  }

  getType(): GraphQLObjectType {
    return this.gqType;
  }

  getTypePlural(): GraphQLList<GraphQLObjectType> {
    return new GraphQLList(this.gqType);
  }

  getTypeNonNull(): GraphQLNonNull<GraphQLObjectType> {
    return new GraphQLNonNull(this.gqType);
  }

  getInputType(): GraphQLInputObjectType {
    return this.getInputTypeComposer().getType();
  }

  hasInputTypeComposer(): boolean {
    return !!this.gqType._gqcInputTypeComposer;
  }

  getInputTypeComposer(): InputTypeComposer {
    if (!this.gqType._gqcInputTypeComposer) {
      this.gqType._gqcInputTypeComposer = toInputObjectType(this);
    }

    return this.gqType._gqcInputTypeComposer;
  }

  getResolvers(): Map<string, Resolver<any, TContext>> {
    if (!this.gqType._gqcResolvers) {
      this.gqType._gqcResolvers = new Map();
    }
    return this.gqType._gqcResolvers;
  }

  hasResolver(name: string): boolean {
    if (!this.gqType._gqcResolvers) {
      return false;
    }
    return this.gqType._gqcResolvers.has(name);
  }

  getResolver(name: string): Resolver<any, TContext> {
    if (!this.hasResolver(name)) {
      throw new Error(`Type ${this.getTypeName()} does not have resolver with name '${name}'`);
    }
    const resolverMap: any = this.gqType._gqcResolvers;
    return resolverMap.get(name);
  }

  setResolver(name: string, resolver: Resolver<any, TContext>): TypeComposer<TContext> {
    if (!this.gqType._gqcResolvers) {
      this.gqType._gqcResolvers = new Map();
    }
    if (!(resolver instanceof this.constructor.schemaComposer.Resolver)) {
      throw new Error('setResolver() accept only Resolver instance');
    }
    this.gqType._gqcResolvers.set(name, resolver);
    resolver.setDisplayName(`${this.getTypeName()}.${resolver.name}`);
    return this;
  }

  addResolver(opts: Resolver<any, TContext> | ResolverOpts<any, TContext>): TypeComposer<TContext> {
    let resolver;
    if (!(opts instanceof this.constructor.schemaComposer.Resolver)) {
      resolver = new this.constructor.schemaComposer.Resolver((opts: any));
    } else {
      resolver = opts;
    }

    if (!resolver.name) {
      throw new Error('resolver should have non-empty name property');
    }
    this.setResolver(resolver.name, resolver);
    return this;
  }

  removeResolver(resolverName: string): TypeComposer<TContext> {
    if (resolverName) {
      this.getResolvers().delete(resolverName);
    }
    return this;
  }

  wrapResolver(
    resolverName: string,
    cbResolver: ResolverWrapCb<any, TContext>
  ): TypeComposer<TContext> {
    const resolver = this.getResolver(resolverName);
    const newResolver = resolver.wrap(cbResolver);
    this.setResolver(resolverName, newResolver);
    return this;
  }

  wrapResolverAs(
    resolverName: string,
    fromResolverName: string,
    cbResolver: ResolverWrapCb<any, TContext>
  ): TypeComposer<TContext> {
    const resolver = this.getResolver(fromResolverName);
    const newResolver = resolver.wrap(cbResolver);
    this.setResolver(resolverName, newResolver);
    return this;
  }

  wrapResolverResolve(
    resolverName: string,
    cbNextRp: ResolverNextRpCb<any, TContext>
  ): TypeComposer<TContext> {
    const resolver = this.getResolver(resolverName);
    this.setResolver(resolverName, resolver.wrapResolve(cbNextRp));
    return this;
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): TypeComposer<TContext> {
    this.gqType.name = name;
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): TypeComposer<TContext> {
    this.gqType.description = description;
    return this;
  }

  setRecordIdFn(fn: GetRecordIdFn<any, TContext>): TypeComposer<TContext> {
    this.gqType._gqcGetRecordIdFn = fn;
    return this;
  }

  hasRecordIdFn(): boolean {
    return !!this.gqType._gqcGetRecordIdFn;
  }

  getRecordIdFn(): GetRecordIdFn<any, TContext> {
    if (!this.gqType._gqcGetRecordIdFn) {
      throw new Error(`Type ${this.getTypeName()} does not have RecordIdFn`);
    }
    return this.gqType._gqcGetRecordIdFn;
  }
  /**
   * Get function that returns record id, from provided object.
   */
  getRecordId(source: ?mixed, args: ?mixed, context: TContext): string | number {
    return this.getRecordIdFn()(source, args, context);
  }

  getFieldArgs(fieldName: string): GraphQLFieldConfigArgumentMap {
    try {
      const field = this.getField(fieldName);
      return field.args || {};
    } catch (e) {
      throw new Error(
        `Cannot get field args. Field '${fieldName}' from type '${this.getTypeName()}' does not exist.`
      );
    }
  }

  hasFieldArg(fieldName: string, argName: string): boolean {
    const fieldArgs = this.getFieldArgs(fieldName);
    return !!fieldArgs[argName];
  }

  getFieldArg(fieldName: string, argName: string): GraphQLArgumentConfig {
    const fieldArgs = this.getFieldArgs(fieldName);

    if (!fieldArgs[argName]) {
      throw new Error(
        `Cannot get arg '${argName}' from type.field '${this.getTypeName()}.${fieldName}'. Argument does not exist.`
      );
    }

    return fieldArgs[argName];
  }

  get(path: string | Array<string>): any {
    return typeByPath(this, path);
  }

  deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this {
    const existedFieldNames = this.getFieldNames();

    if (typeof fields === 'string') {
      if (existedFieldNames.indexOf(fields) === -1) {
        throw new Error(
          `Cannot deprecate unexisted field '${fields}' from type '${this.getTypeName()}'`
        );
      }
      this.extendField(fields, { deprecationReason: 'deprecated' });
    } else if (Array.isArray(fields)) {
      fields.forEach(field => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate unexisted field '${field}' from type '${this.getTypeName()}'`
          );
        }
        this.extendField(field, { deprecationReason: 'deprecated' });
      });
    } else {
      const fieldMap: Object = (fields: any);
      Object.keys(fieldMap).forEach(field => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate unexisted field '${field}' from type '${this.getTypeName()}'`
          );
        }
        const deprecationReason: string = fieldMap[field];
        this.extendField(field, { deprecationReason });
      });
    }

    return this;
  }
}
