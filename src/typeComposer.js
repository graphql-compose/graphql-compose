/* @flow */

import { GraphQLObjectType, GraphQLList, GraphQLInputObjectType } from 'graphql';
import { resolveMaybeThunk } from './utils/misc';
import { isObject, isFunction, isString } from './utils/is';
import { resolveOutputConfigsAsThunk, keepConfigsAsThunk } from './utils/configAsThunk';
import { deprecate } from './utils/debug';
import Resolver from './resolver';
import { toInputObjectType } from './toInputObjectType';
import InputTypeComposer from './inputTypeComposer';
import TypeMapper from './typeMapper';
import { typeByPath } from './typeByPath';

import type {
  Thunk,
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLObjectTypeExtended,
  GraphQLInterfaceType,
  GetRecordIdFn,
  RelationOpts,
  RelationOptsWithResolver,
  RelationThunkMap,
  RelationArgsMapperFn,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  ProjectionType,
  ProjectionMapType,
  ResolverOpts,
  TypeNameString,
  TypeDefinitionString,
  ComposeFieldConfigMap,
  ComposeFieldConfig,
  ComposeObjectTypeConfig,
} from './definition';

export default class TypeComposer {
  gqType: GraphQLObjectTypeExtended;

  static create(
    opts:
     | TypeNameString
     | TypeDefinitionString
     | ComposeObjectTypeConfig<*, *>
     | GraphQLObjectType
  ) {
    let TC;

    if (isString(opts)) {
      const typeName: string = opts;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        TC = new TypeComposer(
          new GraphQLObjectType({
            name: typeName,
            fields: () => ({}),
          })
        );
      } else {
        const type = TypeMapper.createType(typeName);
        if (!(type instanceof GraphQLObjectType)) {
          throw new Error('You should provide correct GraphQLObjectType type definition.');
        }
        TC = new TypeComposer(type);
      }
    } else if (opts instanceof GraphQLObjectType) {
      TC = new TypeComposer(opts);
    } else if (isObject(opts)) {
      const type = new GraphQLObjectType({
        ...opts,
        fields: () => ({}),
      });
      TC = new TypeComposer(type);

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

  constructor(gqType: GraphQLObjectType) {
    this.gqType = gqType;
  }

  /**
   * Get fields from a GraphQL type
   * WARNING: this method read an internal GraphQL instance variable.
   */
  getFields(): GraphQLFieldConfigMap<*, *> {
    const fields: Thunk<GraphQLFieldConfigMap<*, *>> = this.gqType._typeConfig.fields;

    const fieldMap: mixed = keepConfigsAsThunk(resolveMaybeThunk(fields));

    if (isObject(fieldMap)) {
      return { ...fieldMap };
    }
    return {};
  }

  getFieldNames(): string[] {
    return Object.keys(this.getFields());
  }

  /**
   * Completely replace all fields in GraphQL type
   * WARNING: this method rewrite an internal GraphQL instance variable.
   */
  setFields(fields: ComposeFieldConfigMap<*, *>): TypeComposer {
    const prepearedFields: GraphQLFieldConfigMap<*, *> = TypeMapper.convertOutputFieldConfigMap(
      fields,
      this.getTypeName()
    );

    // if field has a projection option, then add it to projection mapper
    Object.keys(prepearedFields).forEach(name => {
      if (prepearedFields[name].projection) {
        // $FlowFixMe
        const projection: ProjectionType = prepearedFields[name].projection;
        this.addProjectionMapper(name, projection);
      }
    });

    this.gqType._typeConfig.fields = () =>
      resolveOutputConfigsAsThunk(prepearedFields, this.getTypeName());
    delete this.gqType._fields; // clear builded fields in type
    return this;
  }

  hasField(fieldName: string): boolean {
    const fields = this.getFields();
    return !!fields[fieldName];
  }

  setField<TSource, TContext>(
    fieldName: string,
    fieldConfig: ComposeFieldConfig<TSource, TContext>
  ): TypeComposer {
    this.addFields({ [fieldName]: fieldConfig });
    return this;
  }

  /**
  * @deprecated 2.0.0
  */
  addField(fieldName: string, fieldConfig: ComposeFieldConfig<*, *>) {
    deprecate('Use TypeComposer.setField() or plural addFields({}) instead.');
    this.addFields({ [fieldName]: fieldConfig });
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newFields: ComposeFieldConfigMap<*, *>): TypeComposer {
    this.setFields({ ...this.getFields(), ...newFields });
    return this;
  }

  /**
   * Get fieldConfig by name
   */
  getField(fieldName: string): ?GraphQLFieldConfig<*, *> {
    const fields = this.getFields();

    if (fields[fieldName]) {
      return fields[fieldName];
    }

    return undefined;
  }

  removeField(fieldNameOrArray: string | Array<string>): TypeComposer {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach(fieldName => delete fields[fieldName]);
    this.setFields({ ...fields });
    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): TypeComposer {
    const keepFieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    Object.keys(fields).forEach(fieldName => {
      if (!keepFieldNames.includes(fieldName)) {
        delete fields[fieldName];
      }
    });
    this.setFields(fields);
    return this;
  }

  extendField(
    name: string,
    parialFieldConfig: ComposeFieldConfig<*, *>
  ): TypeComposer {
    const fieldConfig = {
      ...this.getField(name),
      ...parialFieldConfig,
    };
    this.setField(name, fieldConfig);
    return this;
  }

  reorderFields(names: string[]): TypeComposer {
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

  addRelation(fieldName: string, relationFn: Thunk<RelationOpts<*, *>>): TypeComposer {
    if (!this.gqType._gqcRelations) {
      this.gqType._gqcRelations = {};
    }
    this.gqType._gqcRelations[fieldName] = relationFn;

    return this;
  }

  getRelations(): RelationThunkMap<*, *> {
    if (!this.gqType._gqcRelations) {
      this.gqType._gqcRelations = {};
    }
    return this.gqType._gqcRelations;
  }

  buildRelations(): TypeComposer {
    const relationFields = {};

    const names = Object.keys(this.getRelations());
    names.forEach(fieldName => {
      relationFields[fieldName] = this.buildRelation(fieldName);
    });
    return this;
  }

  buildRelation(fieldName: string): TypeComposer {
    if (!this.gqType._gqcRelations || !isFunction(this.gqType._gqcRelations[fieldName])) {
      throw new Error(
        `Cannot call buildRelation() for type ${this.getTypeName()}. ` +
          `Relation with name '${fieldName}' does not exist.`
      );
    }
    const relationFn: Thunk<RelationOpts<*, *>> = this.gqType._gqcRelations[fieldName];
    // $FlowFixMe
    const relationOpts: RelationOpts = relationFn();

    if (relationOpts.resolver) {
      if (!(relationOpts.resolver instanceof Resolver)) {
        throw new Error(
          'You should provide correct Resolver object for relation ' +
            `${this.getTypeName()}.${fieldName}`
        );
      }
      if (relationOpts.type) {
        throw new Error(
          'You can not use `resolver` and `type` properties simultaneously for relation ' +
            `${this.getTypeName()}.${fieldName}`
        );
      }
      if (relationOpts.resolve) {
        throw new Error(
          'You can not use `resolver` and `resolve` properties simultaneously for relation ' +
            `${this.getTypeName()}.${fieldName}`
        );
      }
      this.addRelationWithResolver(fieldName, relationOpts.resolver, relationOpts);
    } else if (relationOpts.type) {
      this.setField(fieldName, {
        ...relationOpts,
        _gqcIsRelation: true,
      });
    }
    return this;
  }

  addRelationWithResolver<TSource, TContext>(
    fieldName: string,
    resolver: Resolver<TSource, TContext>,
    opts: RelationOptsWithResolver<TSource, TContext>
  ): TypeComposer {
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
    const optsArgs = opts.args || {};
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

    this.setField(fieldName, {
      type: fieldConfig.type,
      description: opts.description,
      deprecationReason: opts.deprecationReason,
      args: argsConfig,
      resolve,
      projection: opts.projection,
      _gqcIsRelation: true,
    });

    return this;
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
  setInterfaces(interfaces: Array<GraphQLInterfaceType>): TypeComposer {
    this.gqType._typeConfig.interfaces = interfaces;
    delete this.gqType._interfaces; // if schema was builded, delete _interfaces
    return this;
  }

  hasInterface(interfaceObj: GraphQLInterfaceType): boolean {
    return this.getInterfaces().indexOf(interfaceObj) > -1;
  }

  addInterface(interfaceObj: GraphQLInterfaceType): TypeComposer {
    if (!this.hasInterface(interfaceObj)) {
      this.setInterfaces([...this.getInterfaces(), interfaceObj]);
    }
    return this;
  }

  removeInterface(interfaceObj: GraphQLInterfaceType): TypeComposer {
    const interfaces = this.getInterfaces();
    const idx = interfaces.indexOf(interfaceObj);
    if (idx > -1) {
      interfaces.splice(idx, 1);
      this.setInterfaces(interfaces);
    }
    return this;
  }

  clone(newTypeName: string): TypeComposer {
    if (!newTypeName) {
      throw new Error('You should provide newTypeName:string for TypeComposer.clone()');
    }

    const fields = this.getFields();
    const newFields = {};
    Object.keys(fields).forEach(fieldName => {
      newFields[fieldName] = { ...fields[fieldName] };
    });

    const cloned = new TypeComposer(
      new GraphQLObjectType({
        name: newTypeName,
        fields: newFields,
      })
    );
    cloned.gqType._gqcProjectionMapper = this.gqType._gqcProjectionMapper;

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
  getFieldType(fieldName: string): GraphQLOutputType | void {
    const field = this.getField(fieldName);
    if (field) {
      return field.type;
    }

    return undefined;
  }

  getType(): GraphQLObjectType {
    return this.gqType;
  }

  getTypePlural(): GraphQLList<GraphQLObjectType> {
    return new GraphQLList(this.gqType);
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

  getResolvers(): Map<string, Resolver<*, *>> {
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

  getResolver(name: string): Resolver<*, *> {
    // $FlowFixMe
    if (!this.hasResolver(name) || !this.gqType._gqcResolvers) {
      throw new Error(`Type ${this.getTypeName()} does not have resolver with name '${name}'`);
    }
    return this.gqType._gqcResolvers.get(name);
  }

  setResolver(name: string, resolver: Resolver<*, *>): TypeComposer {
    if (!this.gqType._gqcResolvers) {
      this.gqType._gqcResolvers = new Map();
    }
    if (!(resolver instanceof Resolver)) {
      throw new Error('setResolver() accept only Resolver instance');
    }
    this.gqType._gqcResolvers.set(name, resolver);
    return this;
  }

  addResolver(resolver: Resolver<*, *> | ResolverOpts<*, *>): TypeComposer {
    if (!(resolver instanceof Resolver)) {
      resolver = new Resolver(resolver); // eslint-disable-line no-param-reassign
    }

    if (!resolver.name) {
      throw new Error('resolver should have non-empty name property');
    }
    this.setResolver(resolver.name, resolver);
    return this;
  }

  removeResolver(resolverName: string): TypeComposer {
    if (resolverName) {
      this.getResolvers().delete(resolverName);
    }
    return this;
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): TypeComposer {
    this.gqType.name = name;
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): TypeComposer {
    this.gqType.description = description;
    return this;
  }

  setRecordIdFn(fn: GetRecordIdFn<*, *>): TypeComposer {
    this.gqType._gqcGetRecordIdFn = fn;
    return this;
  }

  hasRecordIdFn(): boolean {
    return !!this.gqType._gqcGetRecordIdFn;
  }

  getRecordIdFn(): GetRecordIdFn<*, *> {
    if (!this.gqType._gqcGetRecordIdFn) {
      throw new Error(`Type ${this.getTypeName()} does not have RecordIdFn`);
    }
    return this.gqType._gqcGetRecordIdFn;
  }
  /**
  * Get function that returns record id, from provided object.
  */
  getRecordId(source: ?mixed, args: ?mixed, context: ?mixed): string | number {
    return this.getRecordIdFn()(source, args, context);
  }

  getFieldArgs(fieldName: string): ?GraphQLFieldConfigArgumentMap {
    const field = this.getField(fieldName);
    if (field) {
      return field.args;
    }
    return null;
  }

  getFieldArg(fieldName: string, argName: string): ?GraphQLArgumentConfig {
    const fieldArgs = this.getFieldArgs(fieldName) || {};
    return fieldArgs[argName] ? fieldArgs[argName] : undefined;
  }

  /**
  * @deprecated 2.0.0
  */
  getByPath(path: string | Array<string>): mixed {
    deprecate('Use TypeComposer.get() instead.');
    return this.get(path);
  }

  get(path: string | Array<string>): mixed {
    return typeByPath(this, path);
  }

  // Sometimes, when you create relations or some tricky fields,
  // you should have a data from additional fields, that not in a query projection.
  // E.g. for obtaining `friendList` you also should add `friendIds` to projection.
  //      or for `fullname` field you should request `firstname` and `lastname` from DB.
  // this _gqcProjectionMapper used in `projection` module
  addProjectionMapper(fieldName: string, sourceProjection: ProjectionType): TypeComposer {
    if (!this.gqType._gqcProjectionMapper) {
      this.gqType._gqcProjectionMapper = {};
    }
    this.gqType._gqcProjectionMapper[fieldName] = sourceProjection;
    return this;
  }

  getProjectionMapper(): ProjectionMapType {
    return this.gqType._gqcProjectionMapper || {};
  }
}
