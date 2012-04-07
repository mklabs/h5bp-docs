
var path = require('path')
  highlight = require('highlight.js').highlightAuto;

var marked = module.exports = require('marked');

var rDouble = /\[\[([^|\]]+)\|([^\]]+)\]\]/g,
  rSingle = /\[\[([^\]]+)\]\]/g,
  rExt = /\/\//;

marked.toHtml = function toHtml(tokens, baseurl, links) {
  // parse gollum double bracket syntax
  tokens = marked.anchors(tokens, baseurl, links);

  // highlight code blocks
  tokens = marked.highlight(tokens);

  // create a new array from tokens as marked seems to "consume" these.
  // and its a reference to page.tokens we need to keep around.
  var t = tokens.slice(0);
  t.links = tokens.links;
  return marked.parser(t);
};

marked.anchors = function anchors(tokens, baseurl, links) {
  var ln = tokens.length;
  tokens.forEach(function(t) {
    if(t.type === 'paragraph' || t.type === 'text') {
      t.text = marked.gollum(t.text, baseurl, links);
    }
  });
  return tokens;
};

marked.highlight = function hl(tokens) {
  var ln = tokens.length;
  tokens.forEach(function(t) {
    if(t.type === 'code') {
      t.text = highlight(t.text).value;
      t.escaped = true;
    }
  });
  return tokens;
};

marked.gollum = function gollum(text, baseurl, links) {
  text = text.replace(rDouble, function(wholeMatch, m1, m2) {
    var url = rExt.test(m2) ? m2 : join(baseurl, m2.split(' ').join('-')),
      link = get(links, url);

    if(!link) console.error('Unable to find page with url', url);
    return "["+m1+"](../" + path.basename(url) + "/)";
  });

  text = text.replace(rSingle, function(wholeMatch, m1) {
    if(rExt.test(m1)) return m1;
    var url = join(baseurl, m1.split(/(\s)|(\/)/g).join('-')),
      link = get(links, url);

    if(!link) console.error('Unable to find page with url', url);
    return "["+m1+"](../" + path.basename(url) + "/)";
  });
  return text;
};

function join() {
  var args = Array.prototype.slice.call(arguments);
  return path.join.apply(path, args).replace(/\\/g, '/');
}


function get(links, url) {
  url = path.basename(url) === 'index' ? url : join(url, 'index.html');
  url = url.replace(/^\//, '');
  var link = links.filter(function(link) {
    return url === link;
  });
  return link[0];
}
