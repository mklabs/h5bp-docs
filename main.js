
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

  // defaults
  o.layout = o.layout || o.template || path.join(__dirname, 'templates/default/index.html');
  o.baseurl = o.baseurl || './';
  o.dest = o.dest || o.destination || '_site';
  o.cwd = o.cwd || process.cwd();
  o.source = o.src || o.source || '';

  var cwd = this.cwd = path.resolve(o.cwd, o.source);
  this.dest = path.resolve(o.dest);

  var files = this.files = this.find('**/*.md');
  this.pages = this.files.map(function(filepath) {
    return new Page(filepath, {
      cwd: cwd,
      links: files,
      baseurl: o.baseurl
    });
  });

  this.layout = new Layout(o.layout, cwd);
  events.EventEmitter.call(this);
}

util.inherits(Generator, events.EventEmitter);

Generator.prototype.generate = function generate(cb) {
  cb = this.cb(cb);
  var layout = this.layout;
  this.pages.forEach(function(page) {
    // sync, todo: -> async
    page.write('_site', { layout: layout });
  });
  cb();
};

Generator.prototype.find = function find(globs) {
  return glob.sync(globs, { matchBase: true, cwd: this.cwd });
};

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
  this.output = o.output || o.destination || o.dest || '_site';

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
  var cwd = this.cwd;
    output = this.output;

  var links = this.links.map(this.dest.bind(this)).map(function(absolute) {
    return absolute.replace(path.join(cwd, output), '').replace(/^\//, '');
  });
  return marked.toHtml(this.tokens, this.baseurl, links);
};

Page.prototype.write = function write(base, o) {
  if(!o) o = base, base = this.output;

  o = o || {};
  var filepath = this.dest(this.name);
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

Page.prototype.dest = function dest(name) {
  var base = path.join(this.cwd, this.output, this.baseurl);
  name = path.basename(name).replace(path.extname(name), '');
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
