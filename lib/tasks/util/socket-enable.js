(function() {

  var url = 'http://localhost:{{ port }}',
    socket = io.connect(url);

  socket.on('changed', function(file, path, content) {
    console.log('socket', arguments);
    location.assign(location.pathname);
  });
})();
