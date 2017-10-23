const express = require('express')
const schema = require('./schema')
const bodyParser = require('body-parser')
const { graphiqlExpress, graphqlExpress } = require('apollo-server-express')
const server = express()
server.use(bodyParser.json())
server.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }))
server.use('/graphql', graphqlExpress((req) => ({
  schema
})))

server.listen(3000, function () { console.log('app launch on 3000') })
