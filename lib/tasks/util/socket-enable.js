(function() {

  var url = 'http://localhost:{{ port }}',
    socket = io.connect(url);

  socket.on('changed', function(file, path, content) {
    location.assign(location.pathname);
  });

})();
