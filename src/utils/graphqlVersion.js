/* @flow */
/* eslint-disable global-require */

export function getGraphqlVersion(): number {
  if (require('../graphql').lexographicSortSchema) {
    return 13.0;
  }
  return 11.0;
}

export const graphqlVersion = getGraphqlVersion();
