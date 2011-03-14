/**
 * Flash messages only persist for the next request or the next template render!
 * That means 2 redirects without explicitly currying the flash messages will
 * cause the messages to be lost.
 */

var utils = require('./utils'),
    cookies = require('./cookies');


exports.readCookie = function (req) {
    var cookie = req.cookie['_kanso_flash'];
    return cookie ? JSON.parse(unescape(cookie)): [];
};

exports.readMessages = function (req) {
    req.flash_messages = exports.readCookie(req);
};

exports.peekMessages = function (req) {
    var incoming = (req.flash_messages || []);
    var outgoing = (req.outgoing_flash_messages || []);
    return incoming.concat(outgoing);
};

exports.getMessages = function (req) {
    var messages = exports.peekMessages(req);
    req.flash_messages = messages;
    req.outgoing_flash_messages = [];
    return messages;
};

exports.updateResponse = function (req, res) {
    if (typeof res !== 'object') {
        res = {code: 200, body: res};
    }
    var messages = req.outgoing_flash_messages || [];
    exports.setCookie(req, res, '_kanso_flash', JSON.stringify(messages));
    return res;
};

exports.cookieString = function (req, name, val) {
    var baseURL = utils.getBaseURL(req);
    return escape(name) + '=' + escape(val) + '; path=' + baseURL + '/';
};

exports.setCookie = function (req, res, name, val) {
    if (!res.headers) {
        res.headers = {};
    }
    // TODO: is it possible to send multiple set-cookie headers by turning
    // headers into an array like in node?
    // XXX: just replacing all cookies for now - not ideal!
    res.headers['Set-Cookie'] = exports.cookieString(req, name, val);
};

exports.setCookieBrowser = function (req, messages) {
    var val = JSON.stringify(messages);
    var str = exports.cookieString(req, '_kanso_flash', val);
    console.log('Setting cookie: ' + str);
    document.cookie = str;
};

// store new messages on the request until the response is sent later,
// since we don't know the response object until the list / show / update
// function has returned.

exports.addMessage = function (req, message) {
    if (req.response_received) {
        // the function has already returned, addMessage must have been called
        // in a callback for some client-side only function, set the cookie
        // directly
        var cookie = cookies.readCookies()['_kanso_flash'];
        var messages = cookie ? JSON.parse(unescape(cookie)): [];
        messages.push(message);
        exports.setCookieBrowser(req, messages);
    }
    else {
        if (!req.outgoing_flash_messages) {
            req.outgoing_flash_messages = [];
        }
        req.outgoing_flash_messages.push(message);
    }
};
