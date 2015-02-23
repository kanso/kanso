var bisect = require('../');

exports['test find 1 in 0..10'] = function (test) {
  var called = false;
  var expected = 1;
  test.expect(2 + 4); // 4 iterations expected
  var actual = bisect(0, 10, function (index) {
    test.ok(true, "We should get called");
    called = true;
    return index >= expected;
  });
  test.equal(expected, actual, "We should find 1 at index 1");
  test.ok(called, "We should have called our predicate");
  test.done();
}

exports['test find 4 in 0..10'] = function (test) {
  var called = false;
  var expected = 4;
  test.expect(2 + 4); // 4 iterations expected
  var actual = bisect(0, 10, function (index) {
    test.ok(true, "We should get called");
    called = true;
    return index >= expected;
  });
  test.equal(expected, actual, "We should find 4 at index 4");
  test.ok(called, "We should have called our predicate");
  test.done();
}

exports['test find 3 in 0..10'] = function (test) {
  var called = false;
  var expected = 3;
  test.expect(2 + 3); // 4 iterations expected
  var actual = bisect(0, 10, function (index) {
    test.ok(true, "We should get called");
    called = true;
    return index >= expected;
  });
  test.equal(expected, actual, "We should find 3 at index 3");
  test.ok(called, "We should have called our predicate");
  test.done();
}

exports['test find 6 in 0..10'] = function (test) {
  var called = false;
  var expected = 6;
  test.expect(2 + 3); // 3 iterations expected
  var actual = bisect(0, 10, function (index) {
    test.ok(true, "We should get called");
    called = true;
    return index >= expected;
  });
  test.equal(expected, actual, "We should find 6 at index 6");
  test.ok(called, "We should have called our predicate");
  test.done();
}

exports['test find first item'] = function (test) {
  var called = false;
  var expected = 0;
  test.expect(2 + 4); // 3 iterations expected
  var actual = bisect(0, 10, function (index) {
    test.ok(true, "We should get called");
    called = true;
    return true;
  });
  test.equal(expected, actual);
  test.ok(called, "We should have called our predicate");
  test.done();
}

exports['test find last item'] = function (test) {
  var called = false;
  var expected = 9;
  test.expect(2 + 4); // 3 iterations expected
  var actual = bisect(0, 10, function (index) {
    test.ok(true, "We should get called");
    called = true;
    return index >= 9;
  });
  test.equal(expected, actual);
  test.ok(called, "We should have called our predicate");
  test.done();
}


exports['test no matching'] = function (test) {
  var called = false;
  var expected = 10;
  test.expect(2 + 4); // 3 iterations expected
  var actual = bisect(0, 10, function (index) {
    test.ok(true, "We should get called");
    called = true;
    return false;
  });
  test.equal(expected, actual);
  test.ok(called, "We should have called our predicate");
  test.done();
}


exports['test with array'] = function (test) {
  var array = ['a', 'b', 'c'];
  var actual = bisect(array, function (element, index) {
    test.equal('string', typeof element, "We should be testing strings");
    test.equal('number', typeof index, "We should get the index");
    test.equal(element, array[index], "Se should be testing the correct element");
    return element > 'a';
  });
  test.done();
}
