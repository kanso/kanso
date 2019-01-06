var couchdb = require('../lib/couchdb');
var dbname = 'upload-test-db'

var loggerMock = {
  success: function () {},
  info: function () {},
  error: function () {}
}

var pushDocCallback = require('../lib/commands/upload').pushDocCallback;

var exampleDoc = {
  _id: 'some-doc'
}

var savedDoc = {
  _id: 'some-doc',
  _rev: '1-654321'
}

exports['pushDocCallback should callback with no argument on success'] = function (test) {
  test.expect(1);
  var cb = pushDocCallback('/some/path', exampleDoc, 0, {}, loggerMock, assertions);

  cb(null, savedDoc);

  function assertions (err) {
    test.ok(!err, 'there should be no error');
    test.done();
  }
}



exports['pushDocCallback should callback with the error if it gets one'] = function (test) {
  test.expect(1);
  var cb = pushDocCallback('/some/path', exampleDoc, 0, {}, loggerMock, assertions);
  var expected = new Error('some error');

  cb(expected);

  function assertions (err) {
    test.equal(err, expected, 'there should be an error');
    test.done();
  }
}

exports['pushDocCallback should callback with no error and a skip boolean if the option skipped is active'] = function (test) {
  test.expect(2);
  var cb = pushDocCallback('/some/path', exampleDoc, 0, {skip: true}, loggerMock, assertions);
  var expected = new Error('some error');
  expected.error = 'conflict';

  cb(expected);

  function assertions (err, skip) {
    test.ok(!err, 'There should be no error');
    test.equal(skip, true, 'The skip flag should be set');
    test.done();
  }
}

exports['pushDocCallback should callback with an error on conflicts if skip is not set'] = function (test) {
  test.expect(1);
  var cb = pushDocCallback('/some/path', exampleDoc, 0, {skip: false}, loggerMock, assertions);
  var expected = new Error('some error');
  expected.error = 'conflict';

  cb(expected);

  function assertions (err, skip) {
    test.equal(err, expected, 'there should be an error');
    test.done();
  }
}

