/*global escape: false */

var utils = require('./utils');



exports.readBrowserCookies = function () {
    if (!utils.isBrowser) {
        throw new Error('readBrowserCookies cannot be called server-side');
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

exports.readBrowserCookie = function (name) {
    return exports.readBrowserCookies()[name];
};

exports.cookieString = function (req, opt) {
    var path = opt.path || utils.getBaseURL(req) + '/';
    var str = escape(opt.name) + '=' + escape(opt.value) + '; path=' + path;
    if (opt.days) {
        var expires = new Date().setTime(
            new Date().getTime() + 1000 * 60 * 60 * 24 * opt.days
        );
        str += '; expires=' + expires.toGMTString();
    }
    return str;
};

exports.setBrowserCookie = function (req, opt) {
    if (!utils.isBrowser) {
        throw new Error('setBrowserCookie cannot be called server-side');
    }
    var str = (typeof opt === 'string') ? opt: exports.cookieString(req, opt);
    console.log('document.cookie = ' + str);
    document.cookie = str;
};

exports.setResponseCookie = function (req, res, opt) {
    var str = (typeof opt === 'string') ? opt: exports.cookieString(req, opt);
    if (typeof res !== 'object') {
        res = {code: 200, body: res};
    }
    if (!res.headers) {
        res.headers = {};
    }
    // TODO: is it possible to send multiple set-cookie headers by turning
    // headers into an array like in node?
    // XXX: just replacing all cookies for now - not ideal!
    res.headers['Set-Cookie'] = str;
};
