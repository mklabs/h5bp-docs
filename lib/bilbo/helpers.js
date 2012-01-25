
var fs = require('fs'),
  path = require('path'),
  exec = require('child_process').exec,
  mkdirp = require('mkdirp'),
  rimraf = require('rimraf'),
  ncp = require('ncp').ncp,
  ghm = require('github-flavored-markdown'),
  prettify = require('../vendor/prettify');

var basePath = process.cwd();

var helpers = module.exports;

helpers.ensureDir = function ensureDir(dir, callback) {
  // todo: tweak this
  return mkdirp(dir, 0777, callback);
};

// little helper to recursively copy a directory from src to dir
helpers.copyDir = function copyDir(src, to, callback) {

  return rimraf(to, function(err) {
    if(err) return callback(err);
    return ncp(src, to, callback);
  });
};

// escapes internal wiki anchors, in both case, prefix with config.baseurl
// except from external link. links with `//` are assumed to be external
helpers.wikiAnchors = function wikiAnchors(text, config) {
  var bu = config.baseurl;
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, function(wholeMatch, m1, m2) {
    var ext = /\/\//.test(m2),
      p = ext ? m2 : path.join(bu, m2.split(' ').join('-'));

    return "["+m1+"](" + p + ")";
  });

  text = text.replace(/\[\[([^\]]+)\]\]/g, function(wholeMatch, m1) {
    return "["+m1+"](" + path.join(bu, m1.split(' ').join('-')) + "/)";
  });

  return text;
};

// escapes special ``` codeblock
helpers.escapeCodeBlock = function escapeCodeBlock(text) {
  text = text.replace(/```(\w+)([^`]+)```/g, function(wholeMatch, language, code) {
    var lines = wholeMatch.split('\n');
    // get rid of first and last line -> ```language ànd ```
    lines = lines.slice(1, -1);


    // add desired tab space
    lines = lines.map(function(line) {
      // for some reason, external url mess up with pretiffy highligh
      return '    ' + line.replace(/(http|https):\/\//g, '');
    });

    return lines.join('\n');
  });

  return text;
};

// code highlighting helper. It uses prettify and run it against any `<pre><code>` element
helpers.codeHighlight = function codeHighlight(str) {
  return str.replace(/<code>[^<]+<\/code>/g, function (code) {
    code = code.match(/<code>([\s\S]+)<\/code>/)[1];
    code = prettify.prettyPrintOne(code);
    return "<code>" + code + "</code>";
  });
};

// markdown parser to html and makes sure that code snippets are pretty enough
helpers.toHtml = function toHtml(markdown, config, file) {
  var markup;

  try {
    markup = ghm.parse( helpers.wikiAnchors( helpers.escapeCodeBlock( markdown ), config ) );
  } catch(e) {
    console.error('>> got error parsing markup for ', file, config, e);
    markup = '';
  }

  return helpers.codeHighlight( markup );
};


// assets copy helper, fallbacks if necessary
helpers.copyAssets = function copyAssets(config, cb) {
  var tmplAsPath = /\//.test(config.template),
    src = tmplAsPath ? path.resolve(config.template, 'public') : path.join(__dirname, 'templates', config.template, 'public'),
    to = path.resolve(config.dest, 'public');

  return helpers.copyDir(src, to, function(err) {
    // hmmm getting an error here that is not an error
    // but an array :/ An error is actually happenning but not
    // passed through this callback.
    //
    // if(err) return cb(err);
    if(err) return cb(new Error('Got error copying ' + src + ' to ' + to));
    cb();
  });
};

// utilty helper to determine which layout to use.
helpers.computeLayout = function computeLayout(config) {
  var layout;

  var p = /\//.test(config.template) ? path.resolve(config.template, 'index.html') :
    path.join(__dirname, 'templates', config.template, 'index.html');

  return fs.readFileSync(p, 'utf8');
};


// returns the correct template dir path, resolving against cwd if the value
// has some `/` in it, otherwise joins the value to the lib/bilbo/templates path
helpers.templatePath = function templatePath(config) {
  return /\//.test(config.template) ? path.resolve(config.template) :
    path.join(__dirname, 'templates', config.template);
};
