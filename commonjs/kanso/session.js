/**
 * Module dependencies
 */

var db = require('./db'),
    utils = require('./utils');


/**
 * Logs out the current user.
 *
 * @param {Function} callback
 */

exports.logout = function (callback) {
    if (!utils.isBrowser) {
        throw new Error('logout cannot be called server-side');
    }
    db.request({
        type: "DELETE",
        url: "/_session", // don't need baseURL, /_session always available
        username: "_",
        password : "_"
    },
    function (err, resp) {
        if (resp && resp.ok) {
            utils.userCtx = {name: null, roles: []};
        }
        if (callback) {
            callback(err, resp);
        }
    });
};

/**
 * Attempt to login using the username and password provided.
 *
 * @param {String} username
 * @param {String} password
 * @param {Function} callback
 */

exports.login = function (username, password, callback) {
    if (!utils.isBrowser) {
        throw new Error('login cannot be called server-side');
    }
    db.request({
        type: "POST",
        url: "/_session",
        data: {name: username, password: password}
    },
    function (err, resp) {
        if (resp && resp.ok) {
            utils.userCtx = {name: resp.name, roles: resp.roles};
        }
        if (callback) {
            callback(err, resp);
        }
    });
};


exports.info = function (callback) {
    if (!utils.isBrowser) {
        throw new Error('login cannot be called server-side');
    }
    db.request({
        type: "GET",
        url: "/_session"
    },
    function (err, resp) {
        utils.userCtx = (resp && resp.userCtx) || {name: null, roles: []};
        if (callback) {
            callback(err, utils.userCtx);
        }
    });
};
