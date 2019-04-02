---
id: prerequisites
title: Prerequisites
---

## GraphQL

To use this package it would be a good idea to know the basics of [GraphQL](http://graphql.org/), and how the [Type System](http://graphql.org/docs/api-reference-type-system/) works. Since you are going to generate and edit its types you should start out there first.

## Node.js

This package generates GraphQL Schema on the server side. And it will be great if you have experience with Node.js and ES6 syntax.

For serving requests to your generated Schema you should use one of the following packages [express-graphql](https://github.com/graphql/express-graphql) or [apollo-server](https://github.com/apollographql/apollo-server).

## Flowtype/TypeScript

This is optional but quite recommended feature which covers your javascript code with static type-checking. It will help you with autosuggestion and method call validation in your IDE. This package contains built-in type definitions for [Flowtype](https://flow.org/) and [TypeScript](https://www.typescriptlang.org/).

Internally source code of this package is written with Flowtype and has deep static type-checking with [graphq-js](https://github.com/graphql/graphql-js) which is also written with Flow.
