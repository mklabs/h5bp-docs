
var Path = require('path'),
fs = require('fs'),
findit = require('findit'),
ghm = require('github-flavored-markdown'),
connect = require('connect'),
config = require('./config'),
exec = require('child_process').exec,

ensureDir = function(dir, callback){
  return fs.mkdir(dir, '0777', function() {
    return callback();
  });
};


// scan the whole directory
var process = function process() {
  
  var files = [],
  
  fileReg = new RegExp('\\.' + config.ext.join('$|\\.') + '$'),
  
  layout;
  
  // first grab layout content
  
//  fs.rmdirSync(config.dest);
  
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
        console.log('Processing ', file.replace(Path.join(__dirname, config.src) + '/', ''), '...');
        
        var filename = file.replace(Path.join(__dirname, config.src) + '/', ''),
        title = filename.replace(fileReg, ''),
        output = ghm.parse(fs.readFileSync(file, 'utf8')),
        dest = Path.join(__dirname, config.dest, title);
        
        output = layout.replace('{{ content }}', output);

        ensureDir(dest, function() {
          console.log('Writing to', Path.join(dest, 'index.html'));
          fs.writeFileSync(Path.join(dest, 'index.html'), output, 'utf8');
        });
        
      });
      
      
    });
  
};

ensureDir(config.dest, process);


connect.createServer()
  .use(connect.static(Path.join(__dirname)))
  .listen(4000);

