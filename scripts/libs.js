const path = require('path'); // eslint-disable-line no-undef
const lodash = require('lodash'); // eslint-disable-line no-undef

exports.getEmailKey = function getEmailKey(componentPath) { // eslint-disable-line no-undef
  const name = path.basename(componentPath, '.js');
  const dir = path.dirname(componentPath);
  return `${lodash.snakeCase(dir.match(/to\w+/)[0]).toUpperCase()}_${lodash.snakeCase(name).toUpperCase()}`;
};
