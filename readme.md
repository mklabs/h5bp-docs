## h5bp documentation generator

A static site generator written in node. It's lyke Jehyll but somewhat simpler and more focused. takes a src folder, runs it through Markdown and generates for each markdown file (.md, .mkd, .markdown) a complete, static website.

The main purpose of this tiny utility is to work nicely with github wikis (gollum). Running it through this program will generate a static website suitable for serving with Apache or any other web server.

### Quick start

    git://github.com/mklabs/h5bp-docs.git
    cd h5bp-docs
    npm link
  
npm link will install dependencies defined in package.json and create a globally-installed symbolic link from package-name (h5bp-docs for now) to the current folder.

### Usage

    $ h5bp-docs [options]

    options:
      --verbose         Enable verbose output
      --server          Start a static connect server once generation done
      --src             Source folder where markdown files to process are stored
      --assets          assets that get copied in the public folder of dest/
      --dest            Destination folder, place where the generated files will land
      --layout          layout file used to generate each files, using {{{ content }}} placeholder
      -h, --help        You're staring at it
      
#### example

    mkdir test-docs
    cd test-docs
    git clone git://github.com/user/project.wiki.git wikis/project
    h5bp-docs --src wikis/project --dest docs --verbose
    
append `--server` flag to start a static server that will host the generated directory. `--baseurl` allows you to change the location where you'd like to test things locally (localhost:4000/docs/ or localhost:4000/wikis/ for example)
  

### Configuration

The following is a list of the currently supported configuration options. These can all be specified by creating a config.yml (now a bacic commonjs module) file in the site’s root directory. There are also flags for the h5bp executable which are described below next to their respective configuration options. The order of precedence for conflicting settings is:

* Command-line flags
* todo: Configuration file settings (config.yml)
* Defaults (conf/config.js)

```javascript
{
  // --server, when set to true, will start a connect static server once generation is done
  server: false,
  
  // server port used if --server flag provided
  port: 4000,
  
  // destination folder, place where pages are generated
  dest: "./dest",
  
  // a single layout files with {{{ content }}} placeholder
  layout: "./index.html",
  
  // allowed extensions, all other files are ignored 
  ext: ['md', 'markdown', 'mkd'],
  
  // baseurl, only used with --server flag. ex: docs
  baseurl: '',
  
  // Enable verbose output (defaults false)
  verbose: false
}
```
    

### Dependencies

as defined in package.json

* findit:0.1.0,
* github-flavored-markdown: 1.0.0,
* connect: 1.5.1,
* mustache: 0.3.1-dev,
* optimist: 0.2.5 

syntax highlighting done thanks to [prettify](http://code.google.com/p/google-code-prettify/)


    
    
    

