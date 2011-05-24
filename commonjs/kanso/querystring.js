var _ = require('./underscore')._;

/**
 * The majority of this module is taken from node.js and modified slightly
 * to work in the browser.
 */


// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// Query String Utilities

var QueryString = exports;


QueryString.unescape = function (str) {
    return decodeURIComponent(str);
};


QueryString.escape = function (str) {
    return encodeURIComponent(str);
};

var stringifyPrimitive = function (v) {
    switch (typeof v) {
    case 'string':
        return v;

    case 'boolean':
        return v ? 'true' : 'false';

    case 'number':
        return isFinite(v) ? v : '';

    default:
        return '';
    }
};


QueryString.stringify = QueryString.encode = function (obj, sep, eq, name) {
    sep = sep || '&';
    eq = eq || '=';
    obj = (obj === null) ? undefined : obj;

    if (typeof obj === 'object') {
        return _.map(_.keys(obj), function (k) {
            if (_.isArray(obj[k])) {
                return _.map(obj[k], function (v) {
                    return QueryString.escape(stringifyPrimitive(k)) +
                           eq +
                           QueryString.escape(stringifyPrimitive(v));
                }).join(sep);
            }
            else {
                return QueryString.escape(stringifyPrimitive(k)) +
                       eq +
                       QueryString.escape(stringifyPrimitive(obj[k]));
            }
        }).join(sep);
    }
    if (!name) {
        return '';
    }
    return QueryString.escape(stringifyPrimitive(name)) + eq +
           QueryString.escape(stringifyPrimitive(obj));
};

// Parse a key=val string.
QueryString.parse = QueryString.decode = function (qs, sep, eq) {
    sep = sep || '&';
    eq = eq || '=';
    var obj = {};

    if (typeof qs !== 'string' || qs.length === 0) {
        return obj;
    }

    qs.split(sep).forEach(function (kvp) {
        var x = kvp.split(eq);
        var k = QueryString.unescape(x[0]);
        var v = QueryString.unescape(x.slice(1).join(eq));

        if (!(k in obj)) {
            obj[k] = v;
        }
        else if (!_.isArray(obj[k])) {
            obj[k] = [obj[k], v];
        }
        else {
            obj[k].push(v);
        }
    });

    return obj;
};
