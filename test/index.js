
var assert = require('assert'),
  join = require('path').join;

var Generator = require('../');

var site = new Generator({ cwd: join(__dirname, '../.test') });

site.on('error', function(er) {
  console.error('✗ Got error', er.message);
  console.error(er.stack || er.message);
  process.exit(er.code == null ? 1 : er.code);
});

var now = +new Date;
var to = setTimeout(function () { assert.fail('Timeout error'); }, 500);
site.on('end', function() {
  clearTimeout(to);
  console.log(' ✔ Site generated in ', ((+new Date - now) / 1000) + 's');
});

// generate
site.generate();

