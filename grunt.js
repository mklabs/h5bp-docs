config.init({

  defaults: {
    server: false,
    port: 4000,
    source: './',
    dest: './dest',
    layout: './index.html',
    ext: ['md', 'markdown', 'mkd'],
    baseurl: '',
    verbose: false
  },

  generate: {
    site: '<config:defaults>'
  },

  watch: {
    files: '**/*.md',
    tasks: 'generate:site'
  },

  build: '<config:defaults>'

});


// * clean: wipe out previous build dir.
// * compile: compile templates and put them in config.
// * generate: generates site's content from markdown file found in `source`.
// * copy: copy assets from `templates` dir at the correct location in `output`.
// * serve: spawn a local http server on top of the destination output dir.
// * watch: watch for file changes in markdown files and static assets to retrigger the build.
// * reload: works in combination with watch, inject a client-side socket.io script and automatically retrigger a page reload on file changes.
// * build: trigger the build script on top of output/

// task.registerTask('default', 'clean mkdirs compile generate copy build');

// for now, it's just
task.registerTask('default', 'clean generate build');