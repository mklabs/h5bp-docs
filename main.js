
var fs = require('fs'),
  path = require('path'),
  util = require('util'),
  glob = require('glob'),
  events = require('events'),
  marked = require('./markdown'),
  mkdirp = require('mkdirp'),
  rimraf = require('rimraf'),
  hogan = require('hogan');

module.exports = Generator;

function Generator(o) {
  o = o || {};
  var site = this;
  this.options = o;
  this.argv = o.argv;

  // defaults
  o.layout = o.layout || o.template || path.join(__dirname, 'templates/default/index.html');
  o.baseurl = o.baseurl || '';
  o.dest = o.dest || o.destination || '_site';
  o.cwd = o.cwd || process.cwd();
  o.source = o.src || o.source || '';
  // assets to copy from source dir, css, js, png, gif, etc.
  o.assets = o.assets ? o.assets.split(' ') : ['.css', '.js', '.png', '.gif'];

  var cwd = this.cwd = path.resolve(o.cwd, o.source);
  this.dest = path.resolve(o.dest);

  var files = this.files = this.find('**/*.md');
  this.pages = this.files.map(function(filepath) {
    return new Page(filepath, {
      site: site,
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
  var self = this;
  this.clean();

  var assets = this.find('**/*').filter(function(file) {
    var ext = path.extname(file);
    return !!~self.options.assets.indexOf(ext);
  });

  this.pages.forEach(function(page) {
    // sync, todo: -> async
    page.render({ layout: self.layout }).write();
  });

  this.copy(assets, cb);
};

Generator.prototype.clean = function clean(cb) {
  cb ? rimraf(this.dest, cb) : rimraf.sync(this.dest);
  return this;
};

Generator.prototype.copy = function copy(files, cb) {
  files = Array.isArray(files) ? files : files.join(' ');
  var ln = files.length,
    self = this;

  files.forEach(function(file) {
    var to = path.join(self.dest, file);
    mkdirp(path.dirname(to), function(err) {
      if(err) return cb(err);
      var ws = fs.createWriteStream(to).on('close', function() {
        if(--ln) return;
        cb();
      });
      fs.createReadStream(path.join(self.cwd, file)).pipe(ws);
    });
  });

  return this;
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
  this.site = o.site;
  this.cwd = o.cwd || process.cwd();
  this.baseurl = o.baseurl || '';
  this.output = o.output || o.destination || o.dest || '_site';

  this.ext = path.extname(filepath);
  this.basename = path.basename(filepath);
  this.dirname = path.dirname(filepath);
  this.body = fs.readFileSync(path.resolve(this.cwd, filepath), 'utf8');
  this.content = '';

  this.tokens = marked.lexer(this.body);

  this.name = this.basename.replace(this.ext, '');
  this.title = this.heading();

  this.links = o.links || [];
}

Page.prototype.heading = function heading() {
  var h1 = /^#[^#]\s?(.+)$/m,
    match = this.body.match(h1);
  return match ? match[1] : this.name;
};

Page.prototype.render = function render(locals) {
  var cwd = this.cwd;
    output = this.output;

  locals = locals || {};
  locals.page = this;

  var links = this.links.map(this.dest.bind(this)).map(function(absolute) {
    return absolute.replace(path.join(cwd, output), '').replace(/^\//, '');
  });

  this.content = marked.toHtml(this.tokens, this.baseurl, links);
  if(locals.layout) this.content = locals.layout.render(this.toJSON(), locals);
  return this;
};

Page.prototype.write = function write() {
  var filepath = this.dest();
  mkdirp.sync(path.dirname(filepath));
  fs.writeFileSync(filepath, this.content);
  return this;
};

Page.prototype.dest = function dest(name) {
  name = name || this.name;
  name = path.basename(name).replace(path.extname(name), '');
  name = /(index)|(home)/gi.test(name) ? 'index.html' : path.join(name, 'index.html');

  return path.join(this.cwd, this.output, this.baseurl, name);
};

Page.prototype.href = function href(from, to) {
  var toHome = (/(index)|(home)/gi).test(to),
    fromHome = (/(index)|(home)/gi).test(from);

  return path.join(fromHome ? '.' : '..', toHome ? '/' : this.name + '/').replace(/\\/g, '/');
};

Page.prototype.toJSON = function toJSON() {
  var self = this;
  var links = this.links.map(function(l) {
    var page = self.site.pages.filter(function(p) {
      return l === p.file;
    })[0];

    return {
      href: page && page.href(self.file, l),
      title: page && page.title
    };
  });

  return {
    title: this.tille,
    content: this.content,
    files: links,
    baseurl: this.baseurl
  };
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

Layout.prototype.render = function render(data, locals) {
  var body = this.template.render(data, locals);

  var dest = path.dirname(locals.page.dest());
  // handle relative assets
  body = body.replace(/<link rel=["']?stylesheet["']?\shref=['"](.+)["']\s*>/gm, function(match, src) {
    if(src.match(/\/\//)) return match;
    if(src[0] === '/') return match;
    var filepath = path.join(locals.page.cwd, locals.page.output, src);
    return match.replace(src, path.relative(dest, filepath));
  });

  body = body.replace(/<script.+src=['"](.+)["'][\/>]?><[\\]?\/script>/gm, function(match, src) {
    if(src.match(/\/\//)) return match;
    if(src[0] === '/') return match;
    var filepath = path.join(locals.page.cwd, locals.page.output, src);
    return match.replace(src, path.relative(dest, filepath));
  });

  return body;
};
