var utils = require('./utils');


exports.readCookies = function () {
    if (!utils.isBrowser) {
        throw new Error('readCookies cannot be called server-side');
    }
    var cookies = {};
    var parts = document.cookie.split(';');
    for (var i = 0, len = parts.length; i < len; i++) {
        var name = parts[i].split('=')[0];
        var value = parts[i].split('=').slice(1).join('=');
        cookies[name] = value;
    }
    return cookies;
};
