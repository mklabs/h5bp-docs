
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

    new Glob(config.source || '**/*.md')
      .on('error', cb)
      .on('match', function(file) {
        // normalize the path for win care
        file = path.normalize(file);

        // compute file's title: filename minus extension and -
        // compute href: filename/index.html
        // also takes care of files beginning by `.` like `.htaccess`

        var filename = path.basename(file).replace(path.extname(file), '').replace(/^\./, ''),
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
        print('About to generate ', files.length, ' files \n\n');
        print('Writing Home Page to ', path.join(destPath, 'index.html'));

        // turn the hash files back into an array
        files = Object.keys(files).map(function(filename) { return files[filename]; });

        var fileCount = files.length;

        files = files.sort(function(a, b) {
          var left = a.title.toLowerCase(),
            right = b.title.toLowerCase();

          if(left === right) return 0;
          return right < left ? 1 : -1;
        });

        files.forEach(function(file) {

          var output = helpers.toHtml(fs.readFileSync(file.path, 'utf8'), config, file),
            dest = path.join(destPath, file.title === 'Home' ? '' : file.filename);

          // generate edit this page link, todo: set it part of a template
          var edit = '<a class="edit-page" href="//:url/wiki/:filename/_edit">Edit this page</a>'
            .replace(':url', path.join('github.com', config.repo))
            .replace(':filename', file.filename);

          // Layout switching, made here to implement the functionnality
          // and see how that behaves, but this needs to be refactored elsewhere

          // lookup in the config.templates dir any html file whose name is
          // matching the according file title.
          var layoutPath = path.join(helpers.templatePath(config), file.title + '.html');
          layoutTmpl = path.existsSync(layoutPath) ? fs.readFileSync(layoutPath, 'utf8') : layoutTmpl;

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
              // trigger the server, case config.server set to true
              helpers.server(config);

              // copy the public/ dir from template to dest
              helpers.copyAssets(config, cb);
            }
          });

        });
      });
  });

}
