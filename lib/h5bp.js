
// # h5bp documentation generator

// A static site generator writen in node. It's lyke Jehyll but somewhat simpler and more focused.
// takes a `src` folder, runs it through Markdown and generate for each markdown file (.md, .mkd, .markdown)
// a complete, static website.

// ## Configuration
// The following is a list of the currently supported configuration options. These can all be specified by creating 
// a config.yml (now a bacic commonjs module) file in the site’s root directory. There are also flags for the h5bp executable
// which are described below next to their respective configuration options. The order of precedence for 
// conflicting settings is: 
//
// * Command-line flags
// * Configuration file settings (config.yml)
// * Defaults (conf/config.js)

//
// *usage: h5bp-docs [FILE, ...] [options]*
//
//      options:
//        --verbose         Enable verbose output
//        --server          Start a static connect server once generation done
//        --src             Source folder where markdown files to process are stored
//        --dest            Destination folder, place where the generated files will land
//        --layout          layout file used to generate each files, using {{ content }} placeholder
//        -h, --help        You're staring at it

var Path = require('path'),
connect = require('connect'),
fs = require('fs'),
findit = require('findit'),
ghm = require('github-flavored-markdown'),
connect = require('connect'),
Mustache = require('mustache'),
prettify = require('./support/prettify'),
exec = require('child_process').exec,

// docco way of ensuring dir is there
ensureDir = function ensureDir(dir, callback){
  return fs.mkdir(dir, '0777', function() {
    return callback();
  });
},

// code highlighting helper. It uses prettify and run it against any `<pre><code>` element
codeHighlight = function codeHighlight(str) {
  return str.replace(/<pre><code>[^<]+<\/code><\/pre>/g, function (code) {
    code = code.match(/<code>([\s\S]+)<\/code>/)[1];
    code = prettify.prettyPrintOne(code);
    return "<pre><code>" + code + "</code></pre>";
  });
},

// markdown parser to html and makes sure that code snippets are pretty enough
toHtml = function toHtml(markdown) {
  return codeHighlight(ghm.parse(markdown));
},


// start up a connect server with static middleware.
server = function server(config) {
  // only for configuration with config.server set to true (--server)
  if(!config.server) {return;}
  connect.createServer()
    .use(connect.static(Path.join(__dirname)))
    .listen(config.port);
    
  console.log('Server started: localhost:', config.port);
};

// ### main process function.
// Scans the `src` whole directory, 

exports = module.exports = function process(config) {
  
  var files = [],
  fileReg = new RegExp('\\.' + config.ext.join('$|\\.') + '$'),
  layout = fs.readFileSync(config.layout, 'utf8').toString(),
  print = function print() {
    if(!config.verbose) { return; }
    console.log.apply(console, arguments);
  };
  
  // scans the whole dir
  ensureDir(config.dest, function process() {
      
    findit(Path.join(__dirname, config.src))
      .on('file', function(file) {
        if(!fileReg.test(file)) {
          // prevent non markdown files
          return;
        }

        print('Processing ', file);
        files.push(file);
      })

    .on('end', function() {
        var fileCount = files.length;
        print('About to generate ', files.length, ' files');
        print('Writing Home Page to ', Path.join(config.dest, 'index.html'));
      
        fs.writeFileSync(Path.join(config.dest, 'index.html'), layout.replace('{{ content }}', 'Home page'), 'utf8');

        files.forEach(function(file) {

          var filename = file.replace(Path.join(__dirname, config.src) + '/', ''),
          title = filename.replace(fileReg, ''),
          output = toHtml(fs.readFileSync(file, 'utf8')),
          dest = Path.join(__dirname, config.dest, title === 'Home' ? '' : title);

          output = layout.replace('{{ content }}', output);

          ensureDir(dest, function() {
            print('Writing ', dest);
            fs.writeFileSync(Path.join(dest, 'index.html'), output, 'utf8');
            
            if((fileCount--) === 1) {
              server(config);
            }
          });

        });
      });    
  });
  
};