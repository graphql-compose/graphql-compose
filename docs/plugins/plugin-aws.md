---
id: plugin-aws
title: graphql-compose-aws
sidebar_label: AWS plugin
---

This module expose AWS Cloud API via GraphQL.

#### Live demo of AWS SDK API

[AWS SDK API via GraphiQL](https://graphql-compose.herokuapp.com/aws/?query=%0A%0A%23%20%E2%9C%8B%20%F0%9F%9B%91%20Please%20provide%20you%20credentials%20for%20obtaining%20working%20demo.%0A%23%20%E2%9C%8B%20%F0%9F%9B%91%20You%20need%20to%20wait%20about%2030%20seconds%2C%20before%20documentation%20and%0A%23%20autocompletion%20became%20avaliable.%20Needs%20to%20download%20about%0A%23%209MB%20schema%20introspection.%20Free%20Heroku%20account%20is%20not%20so%20fast%2C%20sorry.%0A%0Aquery%20%7B%0A%20%20aws%28config%3A%20%7B%0A%20%20%20%20accessKeyId%3A%20%22---%3E%20YOUR_KEY%20%3C---%22%2C%0A%20%20%20%20secretAccessKey%3A%20%22---%3E%20YOUR_SECRET%20%3C---%22%2C%0A%20%20%7D%29%20%7B%0A%20%20%20%20s3%20%7B%0A%20%20%20%20%20%20listBuckets%20%7B%0A%20%20%20%20%20%20%20%20Buckets%20%7B%0A%20%20%20%20%20%20%20%20%20%20Name%0A%20%20%20%20%20%20%20%20%20%20CreationDate%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%20%20ec2%20%7B%0A%20%20%20%20%20%20euCentralVolumes%3A%20describeVolumes%28%0A%20%20%20%20%20%20%20%20config%3A%20%7B%20region%3A%20%22eu-central-1%22%20%7D%0A%20%20%20%20%20%20%29%20%7B%0A%20%20%20%20%20%20%20%20...VolumeData%0A%20%20%20%20%20%20%7D%0A%0A%20%20%20%20%20%20euWestVolumes%3A%20describeVolumes%28%0A%20%20%20%20%20%20%20%20config%3A%20%7B%20region%3A%20%22eu-west-1%22%20%7D%0A%20%20%20%20%20%20%29%20%7B%0A%20%20%20%20%20%20%20%20...VolumeData%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A%0Afragment%20VolumeData%20on%20AwsEC2DescribeVolumesOutput%20%7B%0A%20%20Volumes%20%7B%0A%20%20%20%20AvailabilityZone%0A%20%20%20%20CreateTime%0A%20%20%20%20Size%0A%20%20%20%20SnapshotId%0A%20%20%20%20State%0A%20%20%20%20VolumeId%0A%20%20%20%20Iops%0A%20%20%20%20VolumeType%0A%20%20%7D%0A%7D%0A%20%20%20%20%20%20)

#### Live demo via [GraphQL Playground](https://graphqlbin.com/plqhO) (improved GraphiQL)

Generated Schema Introspection in SDL format can be found [here](https://raw.githubusercontent.com/graphql-compose/graphql-compose-aws/master/examples/introspection/schema.txt) (more than 10k types, ~2MB).

## AWS SDK GraphQL

Supported all AWS SDK versions via official [aws-sdk](https://github.com/aws/aws-sdk-js) js client. Internally it generates Types and FieldConfigs from AWS SDK configs. You may put this generated types to any GraphQL Schema.

```js
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import awsSDK from 'aws-sdk';
import { AwsApiParser } from 'graphql-compose-aws';

const awsApiParser = new AwsApiParser({
  awsSDK,
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      // Full API
      aws: awsApiParser.getFieldConfig(),

      // Partial API with desired services
      s3: awsApiParser.getService('s3').getFieldConfig(),
      ec2: awsApiParser.getService('ec2').getFieldConfig(),
    },
  }),
});

export default schema;
```

Full [code examples](https://github.com/graphql-compose/graphql-compose-aws/tree/master/examples/)

## Installation

```bash
yarn add graphql graphql-compose aws-sdk graphql-compose-aws
// or
npm install graphql graphql-compose aws-sdk graphql-compose-aws --save
```

Modules `graphql`, `graphql-compose`, `aws-sdk` are in `peerDependencies`, so should be installed explicitly in your app.

## Screenshots

### Get List of EC2 instances from `eu-west-1` region

<img width="1185" alt="screen shot 2017-12-03 at 18 19 28" src="https://user-images.githubusercontent.com/1946920/33525931-c7092c7a-d862-11e7-947b-70380693cc8b.png">

### Several AWS API calls in one query with different services and regions

<img width="1184" alt="screen shot 2017-12-03 at 18 07 50" src="https://user-images.githubusercontent.com/1946920/33525932-c8507656-d862-11e7-9e66-4deb27b8f996.png">

## License

[MIT](https://github.com/graphql-compose/graphql-compose-aws/blob/master/LICENSE.md)
