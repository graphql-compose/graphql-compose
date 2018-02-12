/* @flow strict */
/* eslint-disable global-require */

export function getGraphqlVersion(): number {
  if (require('../graphql').lexicographicSortSchema) {
    return 13.0;
  } else if (require('../graphql').lexographicSortSchema) {
    // 0.13-rc.1
    return 13.0;
  }
  return 11.0;
}

export const graphqlVersion = getGraphqlVersion();
