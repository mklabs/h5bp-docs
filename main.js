
var fs = require('fs'),
  path = require('path'),
  util = require('util'),
  glob = require('glob'),
  nopt = require('nopt'),
  events = require('events'),
  marked = require('./markdown'),
  mkdirp = require('mkdirp'),
  rimraf = require('rimraf'),
  hogan = require('hogan');

module.exports = Generator;
Generator.Page = Page;
Generator.Layout = Layout;
Generator.nopt = nopt;

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
  // optional files filter
  o.filter = o.filter ? new RegExp(o.filter, 'i') : null;
  // assets to copy from source dir, css, js, png, gif, etc.
  o.assets = o.assets || ['**/*.css', '**/*.js', '**/*.png', '**/*.gif']
  // files to generate
  o.files = o.files || '**/*.md';

  var cwd = this.cwd = path.resolve(o.cwd, o.source);
  this.dest = path.resolve(o.dest);

  var files = this.files = this.find(o.files);
  this.pages = this.files.map(function(filepath) {
    return new Page(filepath, {
      site: site,
      cwd: cwd,
      links: files,
      baseurl: o.baseurl,
      dest: o.dest
    });
  });

  this.layout = new Layout(o.layout, cwd);
  events.EventEmitter.call(this);
}

util.inherits(Generator, events.EventEmitter);

Generator.prototype.generate = function generate(cb) {
  cb = this.cb(cb);
  var self = this,
    filter = this.options.filter;

  // clean the previous build dirs
  this.clean();

  // find the asssets to copy
  var assets = this.find(this.options.assets);

  // compute the content of each page from markdown, without layout
  // (but don't write to disk yet)
  this.pages.forEach(function(page) {
    // sync, todo: -> async
    page.render();
  });

  // filter to a subset of pages, if --filter was provided
  var pages = this.pages.filter(function(p) {
    if(!filter) return true;
    return filter.test(p.title) || filter.test(p.name);
  });

  // render each pages with layout and write to disk
  pages.forEach(function(page) {
    // sync, todo: -> async
    var html = page.html({ layout: self.layout });
    page.write(html);
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
  var filter = /^_/;
  globs = Array.isArray(globs) ? globs : globs.split(' ');
  return globs.map(function(pattern) {
    // todo consider dealing with _sidebar / _footer
    return glob.sync(pattern, { matchBase: true, cwd: this.cwd }).filter(function(file) {
      return !filter.test(file) && !filter.test(path.basename(file));
    });
  }).reduce(function(a, b) {
    // should unique this
    return a.concat(b);
  }, []);
};

Generator.prototype.cb = function cb(ns, cb) {
  var self = this;
  return cb || function(er) {
    if(er) return self.emit('error', er);
    var args = Array.prototype.slice.call(this);
    self.emit('end', null, [ns].concat(args));
  };
};

Generator.prototype.toJSON = function toJSON(cb) {
  return {
    pages: this.pages.map(function(p) { return p.toJSON(true); }),
    options: this.options
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

  this.content = this.html(locals);
  return this;
};

Page.prototype.html = function html(locals) {
  var self = this;
  var links = this.links.map(this.dest.bind(this)).map(function(absolute) {
    return absolute.replace(path.join(self.cwd, self.output), '').replace(/^\//, '');
  });

  var content = marked.toHtml(this.tokens, this.baseurl, links);
  if(locals.layout) content = locals.layout.render(this.toJSON(), locals, this.dest());
  return content;
};

Page.prototype.write = function write(content) {
  var filepath = this.dest();
  mkdirp.sync(path.dirname(filepath));
  fs.writeFileSync(filepath, content || this.content);
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

Page.prototype.toJSON = function toJSON(prevent) {
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
    title: this.title,
    slug: this.title.replace(/[^\w\d]+/g, '-'),
    content: this.content,
    files: links,
    baseurl: this.baseurl,
    site: prevent ? {} : this.site.toJSON()
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

Layout.prototype.render = function render(data, locals, dest) {
  var body = this.template.render(data);

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
