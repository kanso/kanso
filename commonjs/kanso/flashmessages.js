var utils = require('./utils'),
    cookies = require('./cookies');


exports.readCookie = function (req) {
    var cookie = req.cookie['_kanso_flash'];
    return cookie ? JSON.parse(unescape(cookie)): [];
};

exports.readMessages = function (req) {
    req.incoming_flash_messages = exports.readCookie(req);
};

exports.getMessages = function (req) {
    return req.incoming_flash_messages || [];
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
        var val = JSON.stringify(messages);
        document.cookie = exports.cookieString(req, '_kanso_flash', val);
    }
    else {
        if (!req.outgoing_flash_messages) {
            req.outgoing_flash_messages = [];
        }
        req.outgoing_flash_messages.push(message);
    }
};
