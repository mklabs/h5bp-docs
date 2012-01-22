




task.registerBasicTask('intro', 'Kindly inform the developer about the impending magic', function(data, name) {

  var output = [
    "=====================================================================",
    "",
    "    BOOYAH !! ",
    "",
    "====================================================================="
  ].join('\n');


  log.writeln(output);

});