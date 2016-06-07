import { GraphQLSchema } from 'graphql';
import compose from './compose';

function initGraphqlTypes() {
  // populate root types in Storage.Types
  getViewerType();
  getRootQueryType();
  getRootMutationType();

  // now all types declared, we are ready to extend types
  resolveUnresolvedRefs();
  addAdditionalFields();
}

function getSchema() {
  initGraphqlTypes();

  const schemaConfig = { query: getRootQueryType() };

  if (Storage.AdditionalFields.has('RootMutation')) {
    schemaConfig.mutation = getRootMutationType();
  }

  return new GraphQLSchema(schemaConfig);
}


export {
  getSchema,
};

