
var fs = require('fs'),
  path = require('path'),
  util = require('util'),
  glob = require('glob'),
  events = require('events'),
  marked = require('./markdown'),
  mkdirp = require('mkdirp'),
  hogan = require('hogan');

module.exports = Generator;

function Generator(o) {
  o = o || {};
  this.options = o;
  this.argv = o.argv;

  var cwd = this.cwd = o.cwd || process.cwd();
  this.dest = path.resolve(o.dest || o.destination || '_site');

  var files = this.files = this.find('**/*.md');
  this.pages = this.files.map(function(filepath) {
    return new Page(filepath, {cwd: cwd, links: files, baseurl: './test/' });
  });

  var defaults = path.join(__dirname, 'templates/default/index.html');
  this.layout = new Layout(o.layout || defaults, cwd);

  events.EventEmitter.call(this);
}

util.inherits(Generator, events.EventEmitter);

Generator.prototype.generate = function generate(cb) {
  cb = this.cb(cb);

  var layout = this.layout;
  this.pages.forEach(function(page) {
    page.write('_site', { layout: layout });
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

function Page(filepath, o) {
  o = o || {};
  this.file = filepath;
  this.cwd = o.cwd || process.cwd();
  this.links = o.links || [];
  this.baseurl = o.baseurl || './';

  this.ext = path.extname(filepath);
  this.basename = path.basename(filepath);
  this.dirname = path.dirname(filepath);
  this.content = fs.readFileSync(path.resolve(this.cwd, filepath), 'utf8');

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
  return marked.toHtml(this.tokens, this.baseurl, this.links);
};

Page.prototype.write = function write(base, o) {
  o = o || {};
  var filepath = this.dest(base, this.name);
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

Page.prototype.dest = function dest(base, name) {
  base = path.resolve(this.cwd, base);
  name = /(index)|(home)/gi.test(name) ? 'index.html' : path.join(name, 'index.html');
  return path.join(base, name);
};


// Layout

function Layout(filepath, cwd) {
  this.file = filepath;
  this.cwd = cwd || process.cwd();

  this.ext = path.extname(filepath);
  this.basename = path.basename(filepath);
  this.dirname = path.dirname(filepath);
  this.body = fs.readFileSync(path.resolve(this.cwd, filepath), 'utf8');
  this.template = hogan.compile(this.body);

  this.name = this.basename.replace(this.ext, '');
}

Layout.prototype.render = function render(data) {
  return this.template.render(data);
};