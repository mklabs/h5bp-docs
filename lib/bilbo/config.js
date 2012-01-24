
exports = module.exports = {
  // --server, when set to true, will start a connect static server once generation is done
  server: false,

  // server port used if --server flag provided
  port: 4000,

  // path to the wiki repository, will walk the dir searching for markdown files
  source: "./",

  // destination folder, place where the generated files will land
  dest: "./dest",

  // a single layout files with a {{ content }} placeholder.
  layout: "./index.html",

  // allowed extensions, all other files are ignored
  ext: ['md', 'markdown', 'mkd'],

  // baseurl, only used with --server flag. ex: docs
  // also it helps to prefix links with some path
  baseurl: '',

  // Enable verbose output (defaults false)
  verbose: false
};
