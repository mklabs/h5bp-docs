var webpage = require('webpage'),
  args = phantom.args;

if (!args.length) {
  console.log([
    '',
    'Usage: renderize.js [URL...]',
    '',
    '',
    'Given a set of url, phantomjs will try to open the page and perform a render with basic options.',
    'The output is simply `hostname.png`'
  ].join('\n'));

  phantom.exit();
}



//args = [args[0]];

(function renderize(links) {

  var link = links.shift();
  if(!link) phantom.exit();

  var page = webpage.create(),
    output = link.replace(/(^https?:\/\/)|(\/$)/g, '').split('/').join('_') + '.png';

  console.log('Loading and opening ' + link + ' to render ' + output);

  page.viewportSize = { width: 1024, height: 768 };
  page.open(link, function(status) {
    if (status !== 'success') {
      console.log('Unable to load the address!', address);
      phantom.exit();
    }

    page.render(output);
    renderize(links);
  });


})(Array.prototype.slice.call(args));


