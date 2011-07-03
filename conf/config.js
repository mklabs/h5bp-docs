
exports = module.exports = {
  // --server, when set to true, will start a connect static server once generation is done
  server: false,
  
  // server port used if --server flag provided
  port: 4000,
  
  // source folder in which markdown files are stored
  src: "./wiki-test",
  
  // destination folder, place where the generated files will land
  dest: "./dest",
  
  // a single layout files with a {{ content }} placeholder.
  layout: "./index.html",
  
  // allowed extensions, all other files are ignored 
  ext: ['md', 'markdown', 'mkd'],
  
  // Enable verbose output (defaults false)
  verbose: false
};