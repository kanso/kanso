[![Build Status](https://travis-ci.org/Floby/node-disect.png)](https://travis-ci.org/Floby/node-disect)

# node-disect

Bisection helper for javascript

## Installation

    npm install --save disect

## Usage

Disect helps you find the first item in a list to satisfy a predicate,
nothing more.

```javascript
disect(0, 100, function (index) {
  return index >= 56;
})
// returns 56


// or with an array
disect([10, 20, 30], function(element, index) {
  return element > 11;
})
// returns 20;

// if you're into that...
Array.prototype.disect = function(predicate) {
  return disect(this, predicate);
}
```

## Reference

#### bisect(min, max, predicate)

Process a bisection on indexes ranging from min to max (max not included) returning the first
that satisfies the predicate. This means that all indices superior to the one returned MUST 
validate the predicate as well.
If no index validates the predicate, then max is returned

* min - Number: the minimum index against which to test
* max - Number: no indices will be tested that are equal or greater than this
* predicate - Function(index): A callback to call to test the index. Needless to say,
the predicate callback should be stateless

#### bisect(array, predicate)

Same as above, except min and max are mapped to 0 and array.length.
The predicates' signature differs.

* array - Array: The array containing the elements to iterate on
* predicate - Function(element, index): A callback to call to test the element of the array at the given index
* 

## Possible evolutions

* async predicates -> async result
* accept iterator instead of range of indices

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2013 Florent Jaby

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
