config.init({

  defaults: {
    source: '**/*.md',
    dest: './dest',
    baseurl: '/dest',
    verbose: false,
    template: 'default',
    repo: 'h5bp/html5-boilerplate'
  },

  generate: {
    site: '<config:defaults>'
  },

  watch: {
    files: '**/*.md',
    tasks: 'generate:site',

    reload: {
      files: '<config:watch.files>',
      tasks: 'generate:site emit:reload'
    }
  },

  build: '<config:defaults>',

  serve: {
    output: {
      port: 3001,
      logs: 'default',
      dirs: true
    }
  },

  emit: {
    reload: {
      config: 'socket',
      event: 'changed'
    }
  }
});



// task.registerTask('default', 'clean mkdirs compile generate copy build');

// for now, it's just
task.registerTask('default', 'generate build');

// reload spawns a local http server with socket.io configured to reload
// the current page. It works in tandem with the watch task which retrigger
// the generation build whenever a file change occurs.
task.registerTask('reload', 'generate build serve watch:reload');
