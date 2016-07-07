/* eslint-disable */

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var chaiSpies = require('chai-spies');

chai.use(chaiAsPromised);
chai.use(chaiSpies);

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:');
  console.error(error && error.stack || error);
});
