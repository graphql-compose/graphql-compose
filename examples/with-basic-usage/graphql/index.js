
const router = require('express').Router()
const graphqlHTTP = require('express-graphql')
const { GQC } = require('graphql-compose')

// get your data Typecomposer
const Food = require('./foods')

GQC.rootQuery().addFields({
  /**
   * Add your expose Query here
   */
  getFoods: Food.getResolver('query')
})

const schema = GQC.buildSchema()
router.use('/graphql', graphqlHTTP({
  schema,
  graphiql: true
}))

module.exports = function () {
  return router
}
