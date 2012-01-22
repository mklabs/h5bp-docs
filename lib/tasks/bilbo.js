
var rimraf = require("rimraf"),
  path = require('path'),
  bilbo = require('../../');

// Grunt tasks


// * clean: wipe out previous build dir.
// * compile: compile templates and put them in config.
// * generate: generates site's content from markdown file found in `source`.
// * copy: copy assets from `templates` dir at the correct location in `output`.
// * serve: spawn a local http server on top of the destination output dir.
// * watch: watch for file changes in markdown files and static assets to retrigger the build.
// * reload: works in combination with watch, inject a client-side socket.io script and automatically retrigger a page reload on file changes.
// * build: trigger the build script on top of output/

task.registerBasicTask('stub', 'Stub stub', function(data, name) {});
task.registerBasicTask('compile', 'compile', function(data, name) {});
task.registerBasicTask('copy', 'copy', function(data, name) {});
task.registerBasicTask('serve', 'serve', function(data, name) {});
task.registerBasicTask('reload', 'reload', function(data, name) {});
task.registerBasicTask('build', 'build', function(data, name) {});

task.registerBasicTask('generate', 'generate', function(data, name) {

  var to = path.resolve(data.dest),
    from = path.resolve(data.source);

  log.writeln('Generate site content to ' + to);
  log.writeln('from files in ' + from);

  var cb = this.async();
  task.helper('bilbo', data, function(err) {
    if(err) return fail.warn(err, 3);
    console.log('All done');
    cb();
  });
});

// the clean task is not really used, since bilbo handle this
task.registerBasicTask('clean', 'Wipe the previous build dirs', function(data, name) {
  var cb = this.async(),
    dirname = path.resolve(name);

  task.helper('clean', dirname, function(err) {
    if(err) return fail.warn(err.message, err.errno || 3);
    cb();
  });

});

// Grunt helpers
task.registerHelper('clean', function(dir, cb) {
  if(!cb) return rimraf.sync(dir);
  rimraf(dir, cb);
});


task.registerHelper('bilbo', bilbo);

