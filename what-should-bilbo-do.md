Todo list
---------

h5bp-docs -> bilbo

* bilbo uses grunt
* bilbo generates a static website from a gollum repository

formerly named h5bp-docs. Have been refactored to use grunt as a build tool, effectively providing us with a nice set of built-in task.

##### plan

1. <del>Make it work on 0.6.x, and windows optionnaly.</del>
2. <del>Rename into bilbo.</del>
3. <del>Setup grunt build skeletton.</del>
4. Port the generation code to several grunt tasks.
5. Rewrite the template logic, and implement the ability to specify different template per page.
6. Implement the watch configuration, backport reload task in there.
7. Integrate the build script on top of output/

xx. Fallback strategy for 0.4.x?

xx. Tests, tests, tests.

## Install

> todo

Should work on node >= 0.6.6 and it should work on Windows too.

Ideally, it sould provide fallback strategy and work on node 0.4.x too.

Either way, you can find and dowload a special for each of these two version with built-in dependencies, if you got trouble installing them through npm.

* for node 0.4.x -> link to download
* for node 0.6.x -> link to download

## Options

* `port`: bind port (default 3000).
* `host`: Host name to listen on (default localhost)
* `version`: Display current version
* `config`: Path to additionnal configuration file
* `source`: Path to the directory for all page files (default: .)
* `output`: Path to the directory for generation output.
* `templates`: Path to the template directory to use. Any html files in there is compiled as an Handlebar template, any other files that is not html (css, js, img, etc.) is copied over to the output dir.


## templates

Or layouts are used to change the template used during generation for each wiki page. Layouts to used is specified using a per page configuration to contain metadata for this page delimited by html comments.

        <!-- config
        {
            layout: "index",
            ...
        }
        -->

This remains valid markdown while providing a hook to place here various metadata information.  The content of the html comment is simply passed through `JSON.parse`, so make sure it is valid json.

This can be put anywhere in the page file (not necessarily at the top, but it's good too).

The `layout ` value should match one of the html template that were compiled as Handlebar templates, any data defined through metadata is passed to the template. A special `body` template variable is passed in and should match the html generated from the markdown page content.

If no `layout` config was specified, it'll lookup for any html files in registered templates that is named exactly the same as the markdown page (`example-using-layouts.md` → `example-using-layouts.html`). If no template of the same name were found, the defaults `index.html` is used.

### template helpers

Handlebars provides us the ability to define custom helpers, and can be put in the `helpers/` dir, relative to the `template` dir from config. This is a special directory that is not parsed during assets copy (eg. any other files than .html is copied to the exact same location in the ouput dir).

Check the `markdown` helper for inspiration on how to write an handlebar helper. Thas is, the `{{{ body }}}` snippet that each template layout should include. Alternately, one may choose to use `{{#markdown body}}` which would do exactly the same.

### Partials

You can use partials too in your template, simply put this snippet of code in it, and it'll translates each `_` as `/` in your filesystem (relative to `templates` dir root).

        {{ > app_templates_foobar }}

Should use the file `app/templates/foobar.html`.


## Command line usage

``` shell
Basic Command Line Usage:
    bilbo [options] [task]

Options:
    --source [source]            The path to the wiki repository (default.).
    --output [output]            The path to generation output directory (default output/)
    --port [port]                Bind port (default 4567).
    --host [host]                Hostname or IP address to listen on (default 0.0.0.0).
    --version                    Display current version.
    --config [config]            Path to additional configuration file
    --templates [PATH]           Specify the sub directory for all template files (default: layouts).
    --watch                      Spawn a file watcher on top of the source directory, retriggering the generation (individually) on file changes.
    --socket                     Set up a socket.io channel refreshing page on file changes, triggers the wath and serve mode automatically.
    --socket-script              Client side script to inject in html files during socket / watch mode.

Tasks:
    clean                       Wipe out previous build dir.
    compile                     Compile templates and put them in config.
    generate                    Generates site's content from markdown file found in `source`.
    copy                        Copy assets from `templates` dir at the correct location in `output`.
    serve                       Spawn a local http server on top of the destination output dir.
    watch                       Watch for file changes in markdown files and static assets to retrigger the build.
    reload                      Works in combination with watch, inject a client-side socket.io script and automatically retrigger a page reload on file changes.
    build                       Trigger the build script on top of output/
```

## layout structure

A default layout structure may look like this


        - site
            - layouts/
                - css/
                - js/
                - img/
                - index.html
                - page.html
                - Example-using-foobar.html
            - wiki/
                - Home.md
                - Example-using-foobar.markdown
            config.json

## Output

Defaults generation output for each wiki page is `example-using-foobar/index.html`. This certainly results in a bunch of subdirectory, but enables most of static web server to use their default file index and get slightly cleaner urls.

## Links

> todo


## Production build

Using grunt provides a nice set of built-in task for various frontend optimization. A set of custom task may be found in `build/tasks` and are used during the build optimization on top of the `output` dir/.

Production builds is triggered at the end of the site's generation, and may be switched by setting the `NODE_ENV` environment variable to `prod` (`production` will work too). Alternately, you may force the build optimization by setting build true in your configuration file, or via the command line `--build` options.

This include:

* js concat / minfification / revving
* css import inline / minification / revving
* img optimization (? in a second step, trickier. Or use buildr.npm.).
* replaces references to optimized assets in each html files.

The build is done through dom parsing (using jsdom on posix, cheerio on windows). Basic optimization strategy is then performed for each relevant tags thas uses `data-build` attributes. The default value for `data-build` is the destination of the optimized assets. In the case of `<link>` and `<script />` tags, several tags may specify the same output dirs, they'll be concat'd, minified and revved automatically. Replacement of theses tags is then performed to match the new optimized asset.

`<img />` acts pretty much the same way, while an additionnal `data-build-datauri` may be set to true to embed the assets automatically as base64 encoded image. CSS may benefits from embed assets too if the build config `datauri` is set to true. Using datauri should serve embedded images only to browsers that support Data-URIs, and serves unmodified stylesheets to Internet Explorer 7 or lower. IE8 has a 32 kb limitation in img file size, IE7 and lower doesn't support datauri but a pretty obscure mhtml format.

## tasks

* clean: wipe out previous build dir.
* compile: compile templates and put them in config.
* generate: generates site's content from markdown file found in `source`.
* copy: copy assets from `templates` dir at the correct location in `output`.
* serve: spawn a local http server on top of the destination output dir.
* watch: watch for file changes in markdown files and static assets to retrigger the build.
* reload: works in combination with watch, inject a client-side socket.io script and automatically retrigger a page reload on file changes.
* build: trigger the build script on top of output/

A task may be run independetly using `bilbo [options] [task]`









