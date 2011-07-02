
var Path = require('path'),
fs = require('fs'),
findit = require('findit'),
 ghm = require('github-flavored-markdown'),
//ghm = require('./ghm'),
connect = require('connect'),
config = require('./config'),
prettify = require('./prettify'),
exec = require('child_process').exec,

g_html_blocks = [],

ensureDir = function ensureDir(dir, callback){
  return fs.mkdir(dir, '0777', function() {
    return callback();
  });
},

codeHighlight = function codeHighlight(str) {
  return str.replace(/<pre><code>[^<]+<\/code><\/pre>/g, function (code) {
    code = code.match(/<code>([\s\S]+)<\/code>/)[1];
    code = prettify.prettyPrintOne(code);
    return "<pre><code>" + code + "</code></pre>";
  });
},

toHtml = function toHtml(markdown) {
  return codeHighlight(ghm.parse(markdown));
//  return escapeWikiAnchors(ghm.parse(markdown));
},



// scan the whole directory
process = function process() {
  
  var files = [],
  
  fileReg = new RegExp('\\.' + config.ext.join('$|\\.') + '$'),
  
  layout;
  
  
  layout = fs.readFileSync(config.layout, 'utf8');
  
  
  findit(Path.join(__dirname, config.src))
    .on('file', function(file) {
      if(!fileReg.test(file)) {
        // prevent non markdown files
        console.log('NOK :', file);
        return;
      }
      
      files.push(file);
    })
    .on('end', function() {
      
      fs.writeFileSync(Path.join(config.dest, 'index.html'), layout.replace('{{ content }}', 'Home page'), 'utf8');
      
      files.forEach(function(file) {
        
        var filename = file.replace(Path.join(__dirname, config.src) + '/', ''),
        title = filename.replace(fileReg, ''),
        output = toHtml(fs.readFileSync(file, 'utf8')),
        dest = Path.join(__dirname, config.dest, title === 'Home' ? '' : title);
        
        output = layout.replace('{{ content }}', output);

        ensureDir(dest, function() {
          fs.writeFileSync(Path.join(dest, 'index.html'), output, 'utf8');
        });
        
      });
      
      
    });
  
};

ensureDir(config.dest, process);



