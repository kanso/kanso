/*global unescape: false */

/**
 * Flash messages help you store state between requests, such as reporting a
 * successful or failed operation after a redirect.
 *
 * The flash message implementation in this module handles both fallback couchdb
 * mode, using cookies to persist state between requests, as well as supporting
 * client-side operation, correctly handling new messages even inside the
 * callbacks of async functions.
 *
 * Flash messages only persist for the next request or the next template render!
 * That means 2 redirects without explicitly currying the flash messages will
 * cause the messages to be lost.
 *
 * @module
 */

/**
 * Module dependencies
 */

var utils = require('kanso/utils'),
    kanso_core = require('kanso/core'),
    cookies = require('cookies'),
    _ = require('underscore');


/**
 * Reads the flash messages cookie from a request object, returning an
 * array of incoming messages.
 *
 * @name readRequestCookie(req)
 * @param {Object} req
 * @returns {Array}
 * @api public
 */

exports.readRequestCookie = function (req) {
    var cookie = req.cookie._kanso_flash;
    var messages = cookie ? JSON.parse(unescape(cookie)): [];
    return _.map(messages, function (val) {
        val.incoming = true;
        val.outgoing = false;
        return val;
    });
};

/**
 * Reads the flash messages cookie from the browser, returning an
 * array of incoming messages.
 *
 * @name readBrowserCookie()
 * @returns {Array}
 * @api public
 */

exports.readBrowserCookie = function () {
    var cookie = cookies.readBrowserCookie('_kanso_flash');
    var messages = cookie ? JSON.parse(unescape(cookie)): [];
    return _.map(messages, function (val) {
        val.incoming = true;
        val.outgoing = false;
        return val;
    });
};

/**
 * Adds a flash_messages property to a request containing all incoming
 * messages.
 *
 * @name updateRequest(req)
 * @param {Object} req
 * @returns {Request Object}
 * @api public
 */

exports.updateRequest = function (req) {
    var messages = exports.readRequestCookie(req);
    req.flash_messages = _.map(messages, function (val) {
        val.incoming = true;
        val.outgoing = false;
        return val;
    });
    return req;
};

/**
 * Get's all current flash messages, stopping them from being outgoing on the
 * next request so they're not repeated.
 *
 * @name getMessages(req)
 * @param {Object} req
 * @returns {Array}
 * @api public
 */

exports.getMessages = function (req) {
    if (utils.isBrowser()) {
        // also remove any messages from this request already set in the cookie
        var cookie_messages = exports.readBrowserCookie();
        var bmessages = _.filter(cookie_messages, function (val) {
            return val.req !== req.uuid;
        });
        if (bmessages.length !== cookie_messages.length) {
            exports.setBrowserCookie(req, bmessages);
        }
    }

    var messages = _.map(req.flash_messages, function (val) {
        val.outgoing = false;
        return val;
    });
    req.flash_messages = messages;

    return _.map(messages, function (val) {
        return val.data;
    });
};

/**
 * Filters all available messages on a request object, returning only those
 * flagged as outgoing (sending in the response to be made available to the next
 * request).
 *
 * @name getOutgoingMessages(req)
 * @param {Object} req
 * @returns {Array}
 * @api public
 */

exports.getOutgoingMessages = function (req) {
    return _.filter(req.flash_messages, function (val) {
        return val.outgoing;
    });
};

/**
 * Updates a response object after a list, show or update function has returned,
 * setting the flash messages cookie to include the outgoing messages.
 *
 * @name updateResponse(req, res)
 * @param {Object} req
 * @param {Object} res
 * @returns {Response Object}
 * @api public
 */

exports.updateResponse = function (req, res) {
    var messages = _.map(exports.getOutgoingMessages(req), function (val) {
        delete val.outgoing;
        delete val.incoming;
        return val;
    });
    if (req.response_received) {
        exports.setBrowserCookie(req, messages);
    }
    else {
        cookies.setResponseCookie(req, res, {
            name: '_kanso_flash',
            value: JSON.stringify(messages),
            path: kanso_core.getBaseURL(req) + '/'
        });
    }
    return res;
};

/**
 * Creates a new flash message object, associating it with the given request.
 *
 * @name createMessage(req, msg)
 * @param {Object} req
 * @param {String} msg
 * @returns {Object}
 * @api public
 */

exports.createMessage = function (req, msg) {
    return {
        req: req.uuid,
        data: msg
    };
};

/**
 * Stores a list of messages in the flash messages cookie. This function is for
 * client-side use.
 *
 * @name setBrowserCookie(req, messages)
 * @param {Object} req
 * @param {Array} messages
 * @api public
 */

exports.setBrowserCookie = function (req, messages) {
    cookies.setBrowserCookie(req, {
        name: '_kanso_flash',
        value: JSON.stringify(messages),
        path: kanso_core.getBaseURL(req) + '/'
    });
};

/**
 * Adds a new flash message for the current request. If the list, show or update
 * function has not returned, it's added to the response Set-Cookie header,
 * otherwise (if its the result of a client-side async operation) it's added
 * directly to the browsers cookies.
 *
 * @name addMessage(req, msg)
 * @param {Object} req
 * @param {String} msg
 * @api public
 */

exports.addMessage = function (req, msg) {
    if (!req.flash_messages) {
        req.flash_messages = [];
    }
    var message = exports.createMessage(req, msg);
    if (req.response_received) {
        // the function has already returned, addMessage must have been called
        // in a callback for some client-side only function, set the cookie
        // directly
        var messages = exports.readBrowserCookie();

        messages.push(message);
        exports.setBrowserCookie(req, messages);
        req.flash_messages.push(message);
    }
    else {
        message.outgoing = true;
        req.flash_messages.push(message);
    }
};

