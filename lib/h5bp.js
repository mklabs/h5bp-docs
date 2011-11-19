
// # h5bp documentation generator

// A static site generator writen in node. It's lyke Jehyll but somewhat
// simpler and more focused.  takes a `src` folder, runs it through Markdown
// and generate for each markdown file (.md, .mkd, .markdown) a complete,
// static website.

// ## Configuration
// The following is a list of the currently supported configuration options.
// These can all be specified by creating a config.yml (now a bacic commonjs
// module) file in the site’s root directory. There are also flags for the h5bp
// executable which are described below next to their respective configuration
// options. The order of precedence for conflicting settings is:
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
//
// todo:
//  * use `utile` and rimraf, cnr, etc. instead of execs.
//  * rewrite and split util methods in an util file, or several * mini and
//  * really basic plugin system, should decouple the findit callback from actual
//  parsing/generation.  should instead be able to iterate through a set of
//  "plugins", each of these may implement a match and process method.
//  * coding style
//  * better logger

var Path = require('path'),
url = require('url');
connect = require('connect'),
fs = require('fs'),
findit = require('findit'),
ghm = require('github-flavored-markdown'),
connect = require('connect'),
Mustache = require('mustache'),
prettify = require('../support/prettify'),
child = require('child_process')
exec = child.exec,

basePath = process.cwd(),

ensureDir = function ensureDir(dir, callback) {
  // todo: tweak this
  return fs.mkdir(dir, 0755, function(err) {
    return callback();
  });
},

// little helper to recursively copy a directory from src to dir
copyDir = function copyDir(src, to, callback) {
  return exec('rm -r ' + to, function(err) {
    return exec('cp -r ' + src + ' '+ to, callback);
  });
},

// escapes internal wiki anchors, in both case, prefix with config.baseurl
// except from external link. links with `//` are assumed to be external
wikiAnchors = function wikiAnchors(text, config) {
  var bu = config.baseurl;
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, function(wholeMatch, m1, m2) {
    var ext = /\/\//.test(m2),
    path = ext ? m2 : Path.join(bu, m2.split(' ').join('-'));
    return "["+m1+"](" + path + ")";
  });

  text = text.replace(/\[\[([^\]]+)\]\]/g, function(wholeMatch, m1) {
    return "["+m1+"](" + Path.join(bu, m1.split(' ').join('-')) + "/)";
  });

  return text;
},

// escapes special ``` codeblock
escapeCodeBlock = function(text) {
  text = text.replace(/```(\w+)([^`]+)```/g, function(wholeMatch, language, code) {
    var lines = wholeMatch.split('\n');
    // get rid of first and last line -> ```language and ```
    lines = lines.slice(1, -1);


    // add desired tab space
    lines = lines.map(function(line) {
      // for some reason, external url mess up with pretiffy highligh
      return '    ' + line.replace(/(http|https):\/\//g, '');
    });

    return lines.join('\n');
  });

  return text;
},

// code highlighting helper. It uses prettify and run it against any `<pre><code>` element
codeHighlight = function codeHighlight(str) {
  return str.replace(/<code>[^<]+<\/code>/g, function (code) {
    code = code.match(/<code>([\s\S]+)<\/code>/)[1];
    code = prettify.prettyPrintOne(code);
    return "<code>" + code + "</code>";
  });
},

// markdown parser to html and makes sure that code snippets are pretty enough
toHtml = function toHtml(markdown, config) {
  return codeHighlight( ghm.parse( wikiAnchors( escapeCodeBlock( markdown ), config) ) );
},


// start up a connect server with static middleware.
server = function server(config) {
  // but only for configuration with config.server set to true (--server)
  if(!config.server) return;
  connect.createServer()
    .use(connect.logger({format: '> :date :method :url'}))
    .use(connect.favicon(Path.join(__dirname, '../public/favicon.ico')))
    .use(config.baseurl || '', connect.static(Path.join(config.dest)))
    .listen(config.port);

  console.log('\nServer started: localhost:', config.port);
},

// assets copy helper, fallbacks if necessary
copyAssets = function copyAssets(config) {
  var src = config.assets ? config.assets : Path.resolve(__dirname, '..', 'public'),
  to = Path.resolve(config.dest, 'public');

  return copyDir(src, to, function(err) {
    if(err) throw err;
  });
},

// utilty helper to determine which layout to use. It first tries to
// get a layout template from where the excutable was used, it then fallbacks
// to the default layout.
computeLayout = function(config) {
  var layout;

  try {
    layout = fs.readFileSync(Path.join(basePath, config.layout), 'utf8').toString();
  } catch (e) {
    console.log('Unable to find ', Path.join(basePath, config.layout), '. Fallback to ', Path.join(__dirname, '..', 'index.html'));
    layout = fs.readFileSync(Path.join(__dirname, '..', 'index.html'), 'utf8').toString();
  }

  return layout;
};


// ### main process function.
// Scans the `src` whole directory,

module.exports = function generate(config) {

  var files = [],
  fileReg = new RegExp('\\.' + config.ext.join('$|\\.') + '$'),
  layoutTmpl = computeLayout(config),
  destPath = Path.join(basePath, config.dest),
  srcPath = Path.join(basePath, config.src),
  print = function print() {
    if(!config.verbose) { return; }
    console.log.apply(console, arguments);
  };

  // scans the whole dir
  ensureDir(destPath, function() {

    print('Generating website with configuration --> ', config);

    findit(srcPath)
      .on('file', function(file) {
        if(!fileReg.test(file)) {
          // prevent non markdown files
          return;
        }

        // compute file's title: filename minus extension and -
        // compute href: filename/index.html
        // also takes care of files beginning by `.` like `.htaccess`
        var filename = file.replace(srcPath + '/', '').replace(fileReg, '').replace(/^\./, ''),
        title = filename.replace(/-/g, ' '),
        href = title === 'Home' ? '/' : Path.join('', destPath, Path.basename(filename), '/').replace(destPath, '');

        files.push({
          path: file,
          href: Path.join(config.baseurl, href),
          filename: filename,
          title: title
        });
      })

      .on('end', function() {
        var fileCount = files.length, layout;
        print('About to generate ', files.length, ' files \n\n');
        print('Writing Home Page to ', Path.join(destPath, 'index.html'));

        files = files.sort(function(a, b) {
          var left = a.title.toLowerCase(),
            right = b.title.toLowerCase();

          if(left === right) return 0;
          return right < left ? 1 : -1;
        });

        files.forEach(function(file) {
          var markdown = fs.readFileSync(file.path, 'utf8'),
            output = toHtml(markdown, config),
            dest = Path.join(destPath, file.title === 'Home' ? '' : file.filename),
            edit;

          // generate edit this page link, todo: set it part of the template
          edit = '<a class="edit-page" href="//github.com/h5bp/html5-boilerplate/wiki/:filename/_edit">Edit this page</a>'
            .replace(':filename', file.filename);


          // TODO: remove this and move in a plugin file, here for testing purpose
          // bunch of todos here:
          // - should which phantomjs, and dump build instructions and link to phantomjs install
          // - a bit long to process all the files, optimize.
          (function() {

            var links, ln, phantom,
              renderize = Path.join(__dirname, '..', 'scripts', 'renderize.js');

            if(file.title === 'Sites using the boilerplate') {
              console.log('do Stuff on ', file);

              // get the links to process
              links = (markdown.match(/\[\[[^\]]+\]\]/g) || []).map(function(str) {
                return (str.replace(/(\[\[)|(\]\])/g, '').split('|')[1] || '').trim();
              });

              console.log('Processing following links: ', [''].concat(links).join('\n - '));

              phantom = child.spawn('phantomjs', [renderize].concat(links), { cwd: dest });
              phantom.stdout.pipe(process.stdout, { end: false });
              phantom.stderr.pipe(process.stderr);

              phantom.on('exit', function(code) {
                console.log(links.length, 'screenshots generated.');
                console.log('All done');
                // async callback trigger here, once mini plugin system is here

                links = links.map(function(link) {
                  link = link.replace(/(^https?:\/\/)|(\/$)/g, '');
                  return ' - [' + link + '](./' + link.split('/').join('_') + '.png)';
                });

                markdown += ['', '', '### Screenshots '].concat(links).join('\n');

                console.log(markdown);

                output = Mustache.to_html(layoutTmpl, {
                  baseurl: config.baseurl,
                  title: file.title,
                  content: toHtml(markdown, config),
                  href: file.href,
                  edit: edit,
                  files: files
                });

                console.log(output);

                print('h5bp-docs: ', file.title, ' -> ', Path.join(dest, 'index.html').replace(destPath, ''));
                fs.writeFileSync(Path.join(dest, 'index.html'), output, 'utf8');

              });
             }

          })();

          if(file.title === 'Sites using the boilerplate') return;

          output = Mustache.to_html(layoutTmpl, {
            baseurl: config.baseurl,
            title: file.title,
            content: output,
            href: file.href,
            edit: edit,
            files: files
          });

          ensureDir(dest, function() {
            print('h5bp-docs: ', file.title, ' -> ', Path.join(dest, 'index.html').replace(destPath, ''));
            fs.writeFileSync(Path.join(dest, 'index.html'), output, 'utf8');

            if((fileCount--) === 1) {
              // undefined assets -> copy of local public folder
              // false assets -> prevent the copy
              // any other value will copy over the assets folder.
              if(config.assets !== false) copyAssets(config);
              server(config);
            }
          });

        });
      });
  });

};
