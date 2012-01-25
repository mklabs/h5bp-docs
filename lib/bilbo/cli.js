
var grunt = require('grunt'),
  path = require('path');

// Our set of defaults options
var defaults = {
  tasks: [path.join(__dirname, '../tasks')],
  config: path.join(__dirname, '../../grunt.js'),
  base: process.cwd()
};

// Use our own version of grunt.cli, needs a little bit more control on this
var cli = module.exports = function cli(options) {

  options = options || defaults;

  // Parse task list and options from the command line.
  var gcli = require('grunt/lib/grunt/cli');

  // CLI-parsed options override any passed-in "defaults" options.
  underscore.defaults(gcli.options, defaults);

  // Plus to that cli-parsed options override, concat the tasks array.
  gcli.options.tasks = gcli.options.tasks.concat(defaults.tasks);

  // Run tasks.
  grunt.tasks(gcli.tasks, gcli.options);
};

