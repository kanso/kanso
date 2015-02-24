/**
 * find the first item in the range to validate the predicate
 */
module.exports = function disect(min, max, fn) {
  var array;
  var index;
  var tested = {};

  if(Array.isArray(min) && arguments.length === 2) {
    array = min;
    min = 0;
    predicate = max;
    max = array.length;
    fn = function(index) {
      return predicate(array[index], index);
    }
  }

  function test (i) {
    if(typeof tested[i] === 'undefined') {
      return tested[i] = fn(i);
    }
    else {
      return tested[i];
    }
  }

  while(max > min +1) {
    index = min + Math.floor((max - min) / 2);
    // true if what we're looking for is lower
    // false if what we're looking for is higher
    if(test(index)) {
      max = index;
    }
    else {
      min = index;
    }
  }
  return test(min) ? min : max;
};
