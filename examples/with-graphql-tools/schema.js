const graphqlCompose = require('graphql-compose')
const { makeExecutableSchema, mergeSchemas } = require('graphql-tools')

const GQC = graphqlCompose.GQC

GQC.rootQuery().addFields({
  gqlCompose: {
    type: 'String',
    resolve: () => 'Hi from gqlCompose'
  }
})

const extraSchema = makeExecutableSchema({
  typeDefs: `
    type Query {
      gqlTools: String
    }
  `,
  resolvers: {
    Query: {
      gqlTools: () => 'Hi from gqlTools'
    }
  }
})
module.exports = mergeSchemas({
  schemas: [extraSchema, GQC.buildSchema()]
  // if your type conflict
  // onTypeConflict: () => ({

  // })
})
