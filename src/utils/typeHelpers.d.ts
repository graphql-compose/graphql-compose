/* @flow */
/* eslint-disable no-use-before-define */

import { isType, parse, isOutputType, isInputType } from '../graphql';
import { GraphQLType, GraphQLNamedType, GraphQLOutputType, GraphQLInputType } from '../graphql';
import { isFunction } from './is';
import { inspect } from './misc';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import { Resolver } from '../Resolver';
import { NonNullComposer } from '../NonNullComposer';
import { ListComposer } from '../ListComposer';
import { ThunkComposer } from '../ThunkComposer';
import { TypeAsString } from '../TypeMapper';

export type AnyTypeComposer<TContext> =
  | NamedTypeComposer<TContext>
  | ListComposer<any>
  | NonNullComposer<any>
  | ThunkComposer<any, any>;

export type NamedTypeComposer<TContext> =
  | ObjectTypeComposer<any, TContext>
  | InputTypeComposer<TContext>
  | EnumTypeComposer<TContext>
  | InterfaceTypeComposer<any, TContext>
  | UnionTypeComposer<any, TContext>
  | ScalarTypeComposer<TContext>;

// Output type should not have `TSource`. It should not affect on main Type source!
export type ComposeNamedOutputType<TContext> =
  | ObjectTypeComposer<any, TContext>
  | EnumTypeComposer<TContext>
  | ScalarTypeComposer<TContext>
  | InterfaceTypeComposer<any, TContext>
  | UnionTypeComposer<any, TContext>;

export type ComposeOutputType<TContext> =
  | ComposeNamedOutputType<TContext>
  | NonNullComposer<any>
  | ListComposer<any>
  | ThunkComposer<any, GraphQLOutputType>;

export type ComposeOutputTypeDefinition<TContext> =
  | Readonly<ComposeOutputType<TContext>>
  | Readonly<GraphQLOutputType>
  | TypeAsString
  | ReadonlyArray<
      | Readonly<ComposeOutputType<TContext>>
      | Readonly<GraphQLOutputType>
      | TypeAsString
      | ReadonlyArray<
          Readonly<ComposeOutputType<TContext>> | Readonly<GraphQLOutputType> | TypeAsString
        >
    >;

export type ComposeNamedInputType<TContext> =
  | InputTypeComposer<TContext>
  | EnumTypeComposer<TContext>
  | ScalarTypeComposer<TContext>;

export type ComposeInputType =
  | ComposeNamedInputType<any>
  | ThunkComposer<ComposeNamedInputType<any>, GraphQLInputType>
  | NonNullComposer<
      | ComposeNamedInputType<any>
      | ThunkComposer<ComposeNamedInputType<any>, GraphQLInputType>
      | ListComposer<any>
    >
  | ListComposer<
      | ComposeNamedInputType<any>
      | ThunkComposer<ComposeNamedInputType<any>, GraphQLInputType>
      | ListComposer<any>
      | NonNullComposer<any>
    >;

export type ComposeInputTypeDefinition =
  | TypeAsString
  | Readonly<ComposeInputType>
  | Readonly<GraphQLInputType>
  | ReadonlyArray<
      | TypeAsString
      | Readonly<ComposeInputType>
      | Readonly<GraphQLInputType>
      | ReadonlyArray<TypeAsString | Readonly<ComposeInputType> | Readonly<GraphQLInputType>>
    >;

export function isComposeType(type: any): type is ComposeOutputType<any> | ComposeInputType;

export function isComposeOutputType(type: any): type is ComposeOutputType<any>;

export function isComposeInputType(type: any): type is ComposeInputType;

export type AnyType<TContext> = NamedTypeComposer<TContext> | GraphQLNamedType;

export function isNamedTypeComposer(type: any): type is ComposeNamedOutputType<any>;

export function isTypeComposer(type: any): type is AnyTypeComposer<any>;

export function getGraphQLType(anyType: any): GraphQLType;

export function getComposeTypeName(type: any): string;

export function unwrapTC<TContext>(anyTC: AnyTypeComposer<TContext>): NamedTypeComposer<TContext>;

export function unwrapInputTC(inputTC: ComposeInputType): ComposeNamedInputType<any>;

export function unwrapOutputTC<TReturn, TContext>(
  outputTC: ComposeOutputType<TContext>
): ComposeNamedOutputType<TContext>;

export function changeUnwrappedTC<TContext, T>(
  anyTC: T,
  cb: (tc: NamedTypeComposer<TContext>) => NamedTypeComposer<TContext> | void | null
): T | void | null;
