var tokenizer = require('../');
var domain = require('domain');

Function.prototype.withDomain = function(withStack) {
  var fn = this;
  return function(test) {
    var d = domain.create();
    d.on('error', function(e) {
      test.fail('test failed with ' + e.message);
      if(withStack) {
        console.error(e.stack)
      }
      test.done();
    });
    d.run(fn.bind(this, test));
  }
}

Function.prototype.timed = function (timeout) {
  var fn = this;
  return function (test) {
    var to = setTimeout(function () {
      test.fail('Test failed to complete under ' + timeout + 'ms');
      test.done();
    }, timeout);

    var begin, end;
    var newTest = Object.create(test);
    newTest.done = function () {
      clearTimeout(to);
      end = Date.now();
      if((end-begin) > timeout) {
        test.fail('Test failed to complete under ' + timeout + 'ms (completed in '+(end-begin)+'ms)' );
      }
      else {
        test.ok(true, "Test completed under " + timeout +'ms');
      }
      test.done();
    }
    begin = Date.now();
    fn.call(this, newTest);
  }
}



exports['test big file of small integers'] = function (test) {
  var numbers = [0];
  for (var i = 0; i < 100000; ++i) {
    numbers.push(Math.floor(Math.random() * 10000));
  };
  var t = tokenizer();
  t.addRule('number');
  t.addRule(/^\d+\.$/, 'maybe-float');
  t.addRule('whitespace');
  t.addRule(/^,$/, 'comma');
  t.ignore('whitespace');
  t.ignore('comma');
  t.on('data', function(token) {
  });
  t.on('end', test.done.bind(test));
  t.end(numbers.join(','));
}.timed(800).withDomain()
