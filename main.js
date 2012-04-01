
var fs = require('fs'),
  path = require('path'),
  util = require('util'),
  glob = require('glob'),
  events = require('events'),
  marked = require('marked'),
  mkdirp = require('mkdirp'),
  hogan = require('hogan');

module.exports = Generator;

function Generator(o) {
  o = o || {};
  this.options = o;
  this.argv = o.argv;
  this.cwd = o.cwd || process.cwd();
  this.files = this.find('**/*.md');

  this.dest = path.resolve(o.dest || o.destination || '_site');

  this.pages = this.files.map(function(filepath) {
    return new Page(filepath);
  });

  this.layout = new Layout(o.layout || path.join(__dirname, 'templates/default/index.html'));

  events.EventEmitter.call(this);
}

util.inherits(Generator, events.EventEmitter);

Generator.prototype.generate = function generate(cb) {
  cb = this.cb(cb);

  var dest = this.dest,
    layout = this.layout;
  this.pages.forEach(function(page) {
    page.write(dest, { layout: layout });
  });

  cb();
};

Generator.prototype.find = function find(globs) {
  return glob.sync(globs, { matchBase: true, cwd: this.cwd });
};


Generator.prototype.ensureDir = function start() {};
Generator.prototype.copyDir = function start() {};

Generator.prototype.block = function block() {};
Generator.prototype.anchors = function anchors() {};
Generator.prototype.highlight = function highlight() {};

Generator.prototype.toHtml = function toHtml() {};
Generator.prototype.copy = function copy() {};

Generator.prototype.layout = function layout() {};

Generator.prototype.cb = function cb(ns, cb) {
  var self = this;
  return cb || function(er) {
    if(er) return self.emit('error', er);
    var args = Array.prototype.slice.call(this);
    self.emit('end', null, [ns].concat(args));
  };
};



// Page

function Page(filepath) {
  this.file = filepath;
  this.ext = path.extname(filepath);
  this.basename = path.basename(filepath);
  this.dirname = path.dirname(filepath);
  this.content = fs.readFileSync(path.resolve(filepath), 'utf8');

  this.tokens = marked.lexer(this.content);

  this.name = this.basename.replace(this.ext, '');
  this.title = this.heading();
}

Page.prototype.heading = function heading() {
  var h1 = /^#\s?(.+)$/m,
    match = this.content.match(h1);

  return match ? match[1] : this.name;
};

Page.prototype.render = function render() {
  return marked.parser(this.tokens);
};

Page.prototype.write = function render(dest, o) {
  o = o || {};
  var filepath = path.join(dest, this.name, 'index.html');
  var content = this.render();
  if(o.layout) content = o.layout.render({
    title: this.title,
    content: content,
    // todo
    files: [],
    baseur: './'
  });

  mkdirp.sync(path.dirname(filepath));
  fs.writeFileSync(filepath, content);
  return this;
};


// Layout

function Layout(filepath) {
  this.file = filepath;
  this.ext = path.extname(filepath);
  this.basename = path.basename(filepath);
  this.dirname = path.dirname(filepath);
  this.body = fs.readFileSync(path.resolve(filepath), 'utf8');
  this.template = hogan.compile(this.body);

  this.name = this.basename.replace(this.ext, '');
}

Layout.prototype.render = function render(data) {
  return this.template.render(data);
};
