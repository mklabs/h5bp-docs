
var fs = require('fs'),
  path = require('path'),
  util = require('util'),
  glob = require('glob'),
  nopt = require('nopt'),
  http = require('http'),
  mime = require('mime'),
  events = require('events'),
  marked = require('./markdown'),
  mkdirp = require('mkdirp'),
  rimraf = require('rimraf'),
  parse = require('url').parse,
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
  o.layout = o.layout;
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

  if(!o.layout) {
    o.template = o.template || path.join(__dirname, 'templates/default');
    o.layout = path.join(o.template, 'index.html');
    o.style = o.style || 'white';
  }

  var cwd = this.cwd = path.resolve(o.cwd, o.source);
  this.dest = path.resolve(o.dest);

  // find the assets to copy
  this.findAssets();

  // find the markdown files to compute / generate / render to disk
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

  this.layout = new Layout(o.layout, {
    site: this,
    cwd: cwd
  });
  events.EventEmitter.call(this);
}

util.inherits(Generator, events.EventEmitter);

Generator.prototype.generate = function generate(cb) {
  cb = this.cb(cb);
  var self = this,
    filter = this.options.filter;

  // clean the previous build dirs
  this.clean();

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

  this.copy(this.assets, cb);
};

Generator.prototype.clean = function clean(cb) {
  cb ? rimraf(this.dest, cb) : rimraf.sync(this.dest);
  return this;
};

Generator.prototype.findAssets = function findAssets() {
  var opts = this.options;
  // find the asssets to copy
  this.assets = this.find(this.options.assets);

  // if a template dir was given (case of default), add the assets
  // within this dir
  if(this.options.template) this.assets = this.assets.concat(this.find('**/*.css', {
    cwd: this.options.template,
    matchBase: true
  }));

  this.assets = this.assets.map(function(filepath) {
    return new Asset(filepath, opts);
  });
};

Generator.prototype.copy = function copy(files, cb) {
  files = Array.isArray(files) ? files : files.join(' ');
  var ln = files.length,
    self = this;

  files.forEach(function(file) {
    var filepath = file.dest(self.cwd);
    mkdirp(path.dirname(filepath), function(err) {
      if(err) return cb(err);
      var ws = fs.createWriteStream(filepath).on('close', function() {
        if(--ln) return;
        cb();
      });
      fs.createReadStream(file.file).pipe(ws);
    });
  });

  return this;
};

Generator.prototype.find = function find(globs, o) {
  var filter = /^_/, self = this;
  globs = Array.isArray(globs) ? globs : globs.split(' ');
  return globs.map(function(pattern) {
    // todo consider dealing with _sidebar / _footer
    var res = glob.sync(pattern, o || { matchBase: true, cwd: self.cwd });
    res = res.filter(function(file) {
      return !filter.test(file) && !filter.test(path.basename(file));
    }).map(function(file) {
      return path.join(o && o.cwd ? o.cwd : self.cwd, file);
    });

    return res;
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
    pages: this.pages.map(function(p) { return p.toJSON(true, p.html({})); }),
    options: this.options
  };
};

Generator.prototype.preview = function preview(cb) {
  var opts = this.options, self = this;
  // base directory
  var base = path.join(opts.cwd, opts.dest);
  // create and store as this.server a basic static http server
  var server = this.server = http.createServer(function(req, res) {
    // store timestamp for latter logging
    var now = new Date;
    // parse our req.url
    var url = parse(req.url);
    // handle index.html
    var pathname = url.pathname.slice(-1) === '/' ? url.pathname + 'index.html' : url.pathname;
    // cleanup leading `/` and resolve to appropriate dir
    pathname = pathname.replace(/^\//, '');
    pathname = path.resolve(base, pathname);

    var page = self.pages.filter(function(p) {
      return p.dest() === pathname;
    })[0];

    if(!page) page = self.assets.filter(function(asset) {
      return asset.dest(opts.cwd) === pathname;
    })[0];

    var status = res.statusCode;
    fs.stat(pathname, function(e) {
      if(e) {
        status = 404;
        pathname = path.join(__dirname, 'templates/404.html');
      }

      color = status >= 500 ? 31 :
        status >= 400 ? 33 :
        status >= 300 ? 36 :
        32;

      if(!page) return send();

      if(page) page.stat(function(e, stat) {
        if(e) console.error(e);
        page.prev = page.prev || (page.prev = stat);

        var changed = +stat.mtime !== +page.prev.mtime;
        if(!changed) return send();

        // update the prev stat object
        page.prev = stat;

        // copy, dealing with page / assets type
        var html = page.html && page.html({ layout: self.layout });
        if(!page.write) self.copy(self.asset, send);
        else {
          page.write(html);
          send();
        }
      });

      function send() {
        res.setHeader('Content-Type', mime.lookup(pathname));
        fs.createReadStream(pathname).on('close', function() {
          console.log('\033[90m' + req.method
            + ' ' + url.pathname + ' '
            + '\033[' + color + 'm' + status
            + ' \033[90m'
            + (new Date - now)
            + 'ms\033[0m');
        }).pipe(res);
      }
    });
  });

  var port = this.options.port || process.env.PORT || 3000;
  server.listen(port);
  console.log('Server started on %d in %s', port, opts.cwd);
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
  this.body = this.content = '';

  this.tokens = [];

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

  this.body = fs.readFileSync(this.file, 'utf8');
  this.tokens = marked.lexer(this.body);

  var content = marked.toHtml(this.tokens, this.baseurl, links);
  locals.page = this;
  if(locals.layout) content = locals.layout.render(this.toJSON(false, content), locals);
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

Page.prototype.stat = function stat(cb) {
  fs.stat(this.file, cb);
  return this;
};

Page.prototype.toJSON = function toJSON(prevent, content) {
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
    content: content,
    files: links,
    baseurl: this.baseurl,
    site: prevent ? {} : this.site.toJSON()
  };
};

// Asset

function Asset(filepath, o) {
  this.file = filepath;

  this.ext = path.extname(filepath);
  this.basename = path.basename(filepath);
  this.dirname = path.dirname(filepath);
  this.body = fs.readFileSync(path.resolve(filepath), 'utf8');
  this.template = o.template || '';
  this.output = o.dest || path.join(process.cwd(), '_site');
}

Asset.prototype.dest = function dest(base) {
  var file = this.file.replace(this.template, '').replace(/^(\/)|(\\)/g, '');
  return path.join(base, this.output, file);
};

Asset.prototype.stat = function stat(cb) {
  fs.stat(this.file, cb);
  return this;
};


// Layout

function Layout(filepath, o) {
  this.file = filepath;
  this.cwd = o.cwd || process.cwd();

  this.site = o.site;

  this.ext = path.extname(filepath);
  this.basename = path.basename(filepath);
  this.dirname = path.dirname(filepath);
  this.body = fs.readFileSync(path.resolve(this.cwd, filepath), 'utf8');
  this.template = hogan.compile(this.body);

  this.name = this.basename.replace(this.ext, '');
}

Layout.prototype.render = function render(data, locals) {
  var body = this.template.render(data);
  var dest = locals.page.dest();

  if(this.site.options.relative === false) return body;

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
