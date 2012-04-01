
Gollum wikis → Static site generator.

## Usage

    usage: h5bp-docs [options]

    options:
      --dest            Destination folder, place where the generated files will land
      --template        Layout file used to generate each files, using {{ content }} placeholder
      --baseurl         Let you define a prefixed value for each generated href,
                        also avalaible as {{ baseurl }} in templates
      -v, --version     display package version
      -h, --help        You're staring at it

    Configuration comes from three sources. The order of precedence for
    conflicting settings is this:

    1. Cli parsed arguments and options
    2. The ./config.json file or the `config` property of ./package.json
    3. Defaults

## Templates

Templates are written using `{{` [mustache
syntax](http://mustache.github.com/) `}}` and compiled / rendered via
[hogan.js](http://twitter.github.com/hogan.js/).

The following properties should be available in templates:

```js
{
  title: 'Title of the page being rendered',
  content: '<p>page html content</p>',
  files: ['/another-page/', '/configuration/', ...],
  baseur: './'
}
```
## Page Links

*This section and the following one are heavily based on
[github/golum](https://github.com/github/gollum/#readme)'s readme.*

A variety of Gollum tags use a double bracket syntax. For example:

    [[Link]]

Some tags will accept attributes which are separated by pipe symbols. For example:

    [[Link|Page Title]]

To link to another page, use the Gollum Page Link Tag.

    [[Page Title]]

The above tag will create a link to the corresponding page file named
`Page-Title.md`

The conversion is as follows:

* Replace any spaces with dashes
* Replace any slashes with dashes

If you'd like the link text to be something that doesn't map directly to
the page name, you can specify the actual page name after a pipe:

    [[Check out this page for more informations|Page Title]]

The above tag will link to Page-Title.md using "Check out this page for
more informations" as the link text.

The page file may exist anywhere in the directory structure of the
repository. It does a breadth first search and uses the first match
that it finds.


## Syntax Highlighting

Code blocks may be indented by 4 spaces or started using three
backticks (as the first characters on the line).

    ```js
      var site = new Generator;
    ``

After that comes the name of the language that is contained by the
block. The block must end with three backticks as the first characters on a line.

[Highlight.js](https://github.com/jgallen23/highlight.js) is used to
generate the appropriate HTML for each code block.

## API

```js
var Generator = require('../');

var site = new Generator;
site.on('error', function(er) {
  console.error('✗ Got error', er.message);
  console.error(er.stack || er.message);
  process.exit(er.code == null ? 1 : er.code);
});

site.on('end', function() {
  console.log(' ✔ Site generated in ');
});

// generate
site.generate();
```

## Tests

    node test


