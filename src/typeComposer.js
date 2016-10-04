/* @flow */

import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  getNamedType,
} from 'graphql';
import { resolveMaybeThunk } from './utils/misc';
import { isObject, isFunction } from './utils/is';
import ResolverList from './resolver/resolverList';
import Resolver from './resolver/resolver';
import { toInputObjectType } from './toInputObjectType';
import InputTypeComposer from './inputTypeComposer';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLFieldConfigMapThunk,
  GraphQLOutputType,
  GraphQLObjectTypeExtended,
  GraphQLInterfaceType,
  GraphQLInterfacesThunk,
  GetRecordIdFn,
  RelationThunk,
  RelationThunkMap,
  RelationArgsMapper,
  RelationArgsMapperFn,
  RelationOpts,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  ObjectMap,
  ProjectionType,
  ProjectionMapType,
} from './definition.js';


export default class TypeComposer {
  gqType: GraphQLObjectTypeExtended;

  constructor(gqType: GraphQLObjectType) {
    this.gqType = gqType;
  }

  /**
   * Get fields from a GraphQL type
   * WARNING: this method read an internal GraphQL instance variable.
   */
  getFields(): GraphQLFieldConfigMap {
    const fields: GraphQLFieldConfigMapThunk | GraphQLFieldConfigMap
      = this.gqType._typeConfig.fields;

    const fieldMap:mixed = resolveMaybeThunk(fields);

    if (isObject(fieldMap)) {
      return Object.assign({}, fieldMap);
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
  setFields(fields: GraphQLFieldConfigMap): void {
    this.gqType._typeConfig.fields = () => fields;
    delete this.gqType._fields; // if schema was builded, delete defineFieldMap
  }

  hasField(fieldName: string): boolean {
    const fields = this.getFields();
    return !!fields[fieldName];
  }

  /**
   * Add field to a GraphQL type
   */
  addField(fieldName: string, fieldConfig: GraphQLFieldConfig) {
    this.addFields({ [fieldName]: fieldConfig });
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newFields: GraphQLFieldConfigMap): void {
    this.setFields(Object.assign({}, this.getFields(), newFields));

    // if field has a projection option, then add it to projection mapper
    Object.keys(newFields).forEach(name => {
      const projection: ProjectionType = newFields[name].projection || newFields[name]._gqcProjection;
      
      if (projection) {
        // $FlowFixMe
        this.addProjectionMapper(name, projection);
      }
    })
  }

  /**
   * Get fieldConfig by name
   */
  getField(fieldName: string): ?GraphQLFieldConfig {
    const fields = this.getFields();

    if (fields[fieldName]) {
      return fields[fieldName];
    }

    return undefined;
  }

  removeField(fieldNameOrArray: string | Array<string>): void {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach((fieldName) => delete fields[fieldName]);
    this.setFields(Object.assign({}, fields)); // immutability
  }

  addRelation(fieldName: string, relationFn: RelationThunk): TypeComposer {
    if (!this.gqType._gqcRelations) {
      this.gqType._gqcRelations = {};
    }
    this.gqType._gqcRelations[fieldName] = relationFn;

    return this;
  }

  getRelations(): RelationThunkMap {
    if (!this.gqType._gqcRelations) {
      this.gqType._gqcRelations = {};
    }
    return this.gqType._gqcRelations;
  }

  buildRelations(): void {
    const relationFields = {};

    const names = Object.keys(this.getRelations());
    names.forEach(fieldName => {
      relationFields[fieldName] = this.buildRelation(fieldName);
    });
  }

  buildRelation(fieldName: string): void {
    if (!this.gqType._gqcRelations || !isFunction(this.gqType._gqcRelations[fieldName])) {
      throw new Error(`Cannot call buildRelation() for type ${this.getTypeName()}. `
                    + `Relation with name '${fieldName}' does not exist.`);
    }
    const relationFn: RelationThunk = this.gqType._gqcRelations[fieldName];
    const relationOpts: RelationOpts = relationFn();
    this.addRelationRaw(fieldName, relationOpts.resolver, relationOpts);
  }

  addRelationRaw(
    fieldName: string,
    resolver: Resolver,
    opts: RelationOpts
  ): TypeComposer {
    if (!(resolver instanceof Resolver)) {
      throw new Error('You should provide correct Resolver object for relation '
                    + `${this.getTypeName()}.${fieldName}`);
    }

    const resolverFieldConfig = resolver.getFieldConfig();
    const argsConfig = Object.assign({}, resolverFieldConfig.args);
    const argsProto = {};
    const argsRuntime: ([string, RelationArgsMapperFn])[] = [];

    // remove args from config, if arg name provided in args
    //    if `argMapVal`
    //       is `undefined`, then keep arg field in config
    //       is `null`, then just remove arg field from config
    //       is `function`, then remove arg field and run it in resolve
    //       is any other value, then put it to args prototype for resolve
    const args = opts.args || {};
    Object.keys(args).forEach(argName => {
      const argMapVal = args[argName];
      if (argMapVal !== undefined) {
        delete argsConfig[argName];

        if (isFunction(argMapVal)) {
          // $FlowFixMe
          argsRuntime.push([argName, argMapVal]);
        } else if (argMapVal !== null) {
          argsProto[argName] = argMapVal;
        }
      }
    });

    // if opts.catchErrors is undefined then set true, otherwise take it value
    const { catchErrors = true } = opts;

    const resolve = (source, args, context, info) => {
      const newArgs = Object.assign({}, args, argsProto);
      argsRuntime.forEach(([argName, argFn]) => {
        newArgs[argName] = argFn(source, args, context, info);
      });

      const payload = resolverFieldConfig.resolve(source, newArgs, context, info);
      return catchErrors
        ? Promise.resolve(payload).catch(e => {
            console.log(
              `GQC ERROR: relation for ${this.getTypeName()}.${fieldName} throws error:`
            );
            console.log(e);
            return null;
          })
        : payload;
    };

    this.addField(fieldName, {
      type: resolverFieldConfig.type,
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
    const interfaces: Array<GraphQLInterfaceType> | ?GraphQLInterfacesThunk
      = this.gqType._typeConfig.interfaces || [];

    if (typeof interfaces === 'function') {
      return interfaces();
    }

    return interfaces || [];
  }

  /**
   * Completely replace all interfaces in GraphQL type
   * WARNING: this method rewrite an internal GraphQL instance variable.
   */
  setInterfaces(interfaces: Array<GraphQLInterfaceType>): void {
    this.gqType._typeConfig.interfaces = interfaces;
    delete this.gqType._interfaces; // if schema was builded, delete _interfaces
  }

  hasInterface(interfaceObj: GraphQLInterfaceType): boolean {
    return this.getInterfaces().indexOf(interfaceObj) > -1;
  }

  addInterface(interfaceObj: GraphQLInterfaceType): void {
    if (!this.hasInterface(interfaceObj)) {
      this.setInterfaces([...this.getInterfaces(), interfaceObj]);
    }
  }

  removeInterface(interfaceObj: GraphQLInterfaceType): void {
    const interfaces = this.getInterfaces();
    const idx = interfaces.indexOf(interfaceObj);
    if (idx > -1) {
      interfaces.splice(idx, 1);
      this.setInterfaces(interfaces);
    }
  }

  clone(newTypeName: string): TypeComposer {
    if (!newTypeName) {
      throw new Error('You should provide newTypeName:string for TypeComposer.clone()');
    }

    const fields = this.getFields();
    const newFields = {};
    Object.keys(fields).forEach(fieldName => {
      newFields[fieldName] = Object.assign({}, fields[fieldName]);
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

  getResolvers(): ResolverList {
    if (!this.gqType._gqcResolvers) {
      this.gqType._gqcResolvers = new ResolverList();
    }
    return this.gqType._gqcResolvers;
  }

  hasResolver(name: string): boolean {
    if (!this.gqType._gqcResolvers) {
      return false;
    }
    return this.gqType._gqcResolvers.has(name);
  }

  getResolver(name: string): Resolver | void {
    if (this.hasResolver(name) && this.gqType._gqcResolvers) {
      return this.gqType._gqcResolvers.get(name);
    }

    return undefined;
  }

  setResolver(resolver: Resolver): void {
    if (!this.gqType._gqcResolvers) {
      this.gqType._gqcResolvers = new ResolverList();
    }
    if (!(resolver instanceof Resolver)) {
      throw new Error('setResolver() accept only Resolver instance');
    }
    if (!resolver.name) {
      throw new Error('resolver should have non-empty name property');
    }
    this.gqType._gqcResolvers.set(resolver.name, resolver);
  }

  addResolver(resolver: Resolver): void {
    this.setResolver(resolver);
  }

  removeResolver(resolver: string|Resolver): void {
    const resolverName = resolver instanceof Resolver
      ? resolver.name
      : resolver;
    if (resolverName) {
      this.getResolvers().remove(resolverName);
    }
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): void {
    this.gqType.name = name;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): void {
    this.gqType.description = description;
  }

  setRecordIdFn(fn: GetRecordIdFn): void {
    this.gqType._gqcGetRecordIdFn = fn;
  }

  hasRecordIdFn(): boolean {
    return !!this.gqType._gqcGetRecordIdFn;
  }

  getRecordIdFn(): GetRecordIdFn {
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

  getByPath(path: string): TypeComposer | InputTypeComposer | void {
    let tc: TypeComposer = this;
    const parts = path.split('.');
    while(parts.length > 0) {
      const name = parts[0];
      const nextName = parts[1];
      if (!name) return undefined;

      if (nextName && nextName.startsWith('@')) {
        const arg = tc.getFieldArg(name, nextName.substring(1));
        if (!arg) return undefined;
        const argType = getNamedType(arg.type);
        if (argType instanceof GraphQLInputObjectType) {
          const itc = new InputTypeComposer(argType);
          return itc.getByPath(parts.slice(2).join('.'));
        }
        return undefined;
      }

      const fieldType = getNamedType(this.getFieldType(name));
      if (fieldType) {
        if (fieldType instanceof GraphQLObjectType) {
          tc = new TypeComposer(fieldType);
          parts.shift();
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
    return tc;
  }


  // Sometimes, when you create relations or some tricky fields,
  // you should have a data from additional fields, that not in a query projection.
  // E.g. for obtaining `friendList` you also should add `friendIds` to projection.
  //      or for `fullname` field you should request `firstname` and `lastname` from DB.
  // this _gqcProjectionMapper used in `projection` module
  addProjectionMapper(fieldName: string, sourceProjection: ProjectionType):void {
    if (!this.gqType._gqcProjectionMapper) {
      this.gqType._gqcProjectionMapper = {};
    }
    this.gqType._gqcProjectionMapper[fieldName] = sourceProjection;
  }

  getProjectionMapper(): ProjectionMapType {
    return this.gqType._gqcProjectionMapper || {};
  }
}
