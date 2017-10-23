const express = require('express')
const graphql = require('./graphql')
const bodyParser = require('body-parser')

const server = express()

/**
 * ensure you put use bodyparser before graphql
 */
server.use(bodyParser.json())
server.use(graphql())

server.listen(3000, function () {
  console.log('app launch on 3000')
  console.log('Go to http://localhost:3000/graphql for preview')
})
