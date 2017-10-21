const { TypeComposer } = require('graphql-compose')

/**
 * Create your data type
 * and exports
 */
const FoodTC = module.exports = TypeComposer.create({
  name: 'Food',
  fields: {
    id: 'String',
    name: 'String',
    origin: 'String',
    pictureURL: 'String'
  },
  description: 'food data model'
})

/**
 * Tell Typecomposer
 * how to resolve data
 */
FoodTC.addResolver({
  name: 'query',
  description: 'List of my favourite food around the world',
  // result type of this resolver
  // an array of FoodTC
  type: [FoodTC],

  // how to resolve data
  resolve: ({ source, args, context }) => {
    return [
        { id: '0', name: 'Tom-Yum-Kung', origin: 'Thailand', pictureURL: 'https://www.google.co.th/url?sa=i&rct=j&q=&esrc=s&source=imgres&cd=&cad=rja&uact=8&ved=0ahUKEwjH6qiu84DXAhVLvI8KHXhOBfUQjRwIBw&url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FTom_yum&psig=AOvVaw0kylNzOIlrR2Yexk1wYSvi&ust=1508647320251226' },
        { id: '1', name: 'Kimchi-Jjigae', origin: 'Korea', pictureURL: 'https://www.google.co.th/url?sa=i&rct=j&q=&esrc=s&source=imgres&cd=&cad=rja&uact=8&ved=0ahUKEwj2gszP84DXAhWBPo8KHW3lAU8QjRwIBw&url=https%3A%2F%2Fnorecipes.com%2Fkimchi-jjigae&psig=AOvVaw3mYTd6Mbdf_8boDB15vDgx&ust=1508647389955748' }
    ]
  }
})
