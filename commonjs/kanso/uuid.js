/*!
 * Adapted from Math.uuid.js by Robert Kieffer
 * Math.uuid.js (v1.4)
 * http://www.broofa.com
 * mailto:robert@broofa.com
 *
 * Copyright (c) 2010 Robert Kieffer
 * Dual licensed under the MIT and GPL licenses.
 */

var CHARS = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');

exports.generate = function () {
    var uuid = new Array(32), rnd = 0, r;
    for (var i = 0; i < 32; i++) {
        if (rnd <= 0x02) {
            rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
        }
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = CHARS[(i == 19) ? (r & 0x3) | 0x8 : r];
    }
    return uuid.join('');
};
