
var fs = require('fs'),
  path = require('path'),
  Glob = require("glob").Glob,
  Mustache = require('mustache'),
  exec = require('child_process').exec,
  helpers = require('./bilbo/helpers');

var bilbo = module.exports = bilbo;

// bilbo helpers
bilbo.helpers = helpers;


var basePath = process.cwd();

// main process function.
//
// Scans the `src` whole directory, then lookup for any markdown files
// to generates the static site to `dest`.

function bilbo(config, cb) {

  var files = {},
    fileReg = new RegExp('\\.' + config.ext.join('$|\\.') + '$'),
    layoutTmpl = helpers.computeLayout(config),
    destPath = path.join(basePath, config.dest),
    srcPath = path.join(basePath, config.src),
    print = function print() {
      if(!config.verbose) { return; }
      console.log.apply(console, arguments);
    };

  // scans the whole dir
  helpers.ensureDir(destPath, function (err) {
    if(err) return cb(err);

    print('Generating website with configuration --> ', config);

    new Glob('**/*.md')
      .on('error', cb)
      .on('match', function(file) {
        // normalize the path for win care
        file = path.normalize(file);

        if(!fileReg.test(file)) {
          // prevent non markdown files
          return;
        }

        // compute file's title: filename minus extension and -
        // compute href: filename/index.html
        // also takes care of files beginning by `.` like `.htaccess`

        var filename = path.basename(file).replace(fileReg, '').replace(/^\./, ''),
          title = filename.replace(/-/g, ' '),
          href = title === 'Home' ? '/' : [destPath, path.basename(filename), ''].join('/').replace(destPath, '');

        files[filename] = {
          path: file,
          // unix like path splitting for hrefs
          href: [config.baseurl, href].join('/').replace(/\/\//g, '/'),
          filename: filename,
          title: title
        };
      })

      .on('end', function() {
        var fileCount = files.length, layout;
        print('About to generate ', files.length, ' files \n\n');
        print('Writing Home Page to ', path.join(destPath, 'index.html'));

        // turn the hash files back into an array
        files = Object.keys(files).map(function(filename) { return files[filename]; });

        files = files.sort(function(a, b) {
          var left = a.title.toLowerCase(),
            right = b.title.toLowerCase();

          if(left === right) return 0;
          return right < left ? 1 : -1;
        });

        files.forEach(function(file) {

          var output = helpers.toHtml(fs.readFileSync(file.path, 'utf8'), config, file),
            dest = path.join(destPath, file.title === 'Home' ? '' : file.filename),
            edit;

          // generate edit this page link, todo: set it part of the template
          // todo: the url needs to be a configuration option, or guessed from git current repo optionnaly
          // todo: the markup needs to be put elsewhere, probably through one of layouts/ template
          edit = '<a class="edit-page" href="//github.com/h5bp/html5-boilerplate/wiki/:filename/_edit">Edit this page</a>'
            .replace(':filename', file.filename);

          output = Mustache.to_html(layoutTmpl, {
            baseurl: config.baseurl,
            title: file.title,
            content: output,
            href: file.href,
            edit: edit,
            files: files
          });

          helpers.ensureDir(dest, function(err) {
            if(err) return cb(err);
            print('bilbo-docs: ', file.title, ' -> ', path.join(dest, 'index.html').replace(destPath, ''));
            fs.writeFileSync(path.join(dest, 'index.html'), output, 'utf8');

            if((fileCount--) === 1) {
              // undefined assets -> copy of local public folder
              // false assets -> prevent the copy
              // any other value will copy over the assets folder.
              helpers.server(config);

              // false for assets, otherwise the relative path
              if(config.assets !== false) return helpers.copyAssets(config, cb);
              cb();
            }
          });

        });
      });
  });

}
