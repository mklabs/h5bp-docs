
exports = module.exports = {
  // --server, when set to true, will start a connect static server once generation is done
  server: false,

  // server port used if --server flag provided
  port: 4000,

  // destination folder, place where the generated files will land
  dest: "./dest",

  // a single layout files with a {{ content }} placeholder.
  layout: "./index.html",

  // Use a custom layout for MyCustom and TOC.
  // Don't include the extension when specifying the file names.
  customLayout: {'MyCustom': './custom.html',
                 'TOC':  './toc.html'},

  // allowed extensions, all other files are ignored 
  ext: ['md', 'markdown', 'mkd'],

  // How to replace the {{{ edit }}} placeholder. Must contain ":filename" somewhere.
  edit: '<a class="edit-page" href="http://github.com/h5bp/html5-boilerplate/wiki/:filename/_edit">Edit this page</a>',

  // baseurl, only used with --server flag. ex: docs
  // also it helps to prefix links with some path
  baseurl: '',

  // Enable verbose output (defaults false)
  verbose: false
};
