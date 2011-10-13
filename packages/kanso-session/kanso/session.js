/**
 * Functions related to the management of user sessions and account information.
 *
 * @module
 */

/**
 * Module dependencies
 */

var db = require('db'),
    users = require('users'),
    cookies = require('cookies'),
    events = require('kanso/events'),
    utils = require('kanso/utils');


/**
 * Creates a fake request to /_session to pass to sessionChange, useful
 * when using functions such as templates.render
 *
 * @name fakeRequest(userCtx, callback)
 * @param {Object} userCtx
 * @param {Function} callback
 * @api public
 */

exports.fakeRequest = function (userCtx, callback) {
    db.newUUID(100, function (err, uuid) {
        if (err) {
            return callback(err);
        }
        callback(null, {
            userCtx: userCtx,
            uuid: uuid,
            method: 'GET',
            query: {},
            headers: {},
            path: ['_session'],
            client: true,
            initial_hit: utils.initial_hit,
            cookie: cookies.readBrowserCookies()
        });
    });
};

/**
 * Calls sessionChange if exported from the currently loaded app.
 *
 * @name sessionChange(userCtx, callback)
 * @param {Object} userCtx
 * @param {Function} callback
 * @api public
 */

exports.sessionChange = function (userCtx, callback) {
    var req = exports.fakeRequest(userCtx, function (err, req) {
        if (err) {
            if (callback) {
                return callback(err);
            }
            throw err;
        }
        events.emit('sessionChange', userCtx, req);
        if (callback) {
            callback();
        }
    });
};

/**
 * Logs out the current user.
 *
 * @name logout(callback)
 * @param {Function} callback
 * @api public
 */

exports.logout = function (callback) {
    if (!utils.isBrowser()) {
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
            utils.session = {userCtx: utils.userCtx};
            exports.sessionChange(utils.userCtx);
        }
        if (callback) {
            callback(err, resp);
        }
    });
};

/**
 * Attempt to login using the username and password provided.
 *
 * @name login(username, password, callback)
 * @param {String} username
 * @param {String} password
 * @param {Function} callback
 * @api public
 */

exports.login = function (username, password, callback) {
    if (!utils.isBrowser()) {
        throw new Error('login cannot be called server-side');
    }
    db.request({
        type: "POST",
        url: "/_session",
        data: {name: username, password: password}
    },
    function (err, resp) {
        if (resp && resp.ok) {
            // TODO: for some reason resp.name is set to null in the response
            // even though the roles are correct for the user! Look into this
            // and see if its a bug in couchdb, for now, just using the username
            // given to the login function instead, since we know the login
            // request was accepted.
            //utils.userCtx = {name: resp.name, roles: resp.roles};
            utils.userCtx = {name: username, roles: resp.roles};
            utils.session = {userCtx: utils.userCtx};
            exports.sessionChange(utils.userCtx);
        }
        if (callback) {
            callback(err, resp);
        }
    });
};


/**
 * Returns the current user's session information.
 *
 * @name info(callback)
 * @param {Function} callback
 * @api public
 */

exports.info = function (callback) {
    if (!utils.isBrowser()) {
        throw new Error('info cannot be called server-side');
    }
    db.request({
        type: "GET",
        url: "/_session"
    },
    function (err, resp) {
        var oldUserCtx = utils.userCtx;
        utils.session = resp;
        utils.userCtx = (resp && resp.userCtx) || {name: null, roles: []};
        // TODO: should this check for differences in more than just name?
        if (!oldUserCtx || oldUserCtx.name !== utils.userCtx.name) {
            exports.sessionChange(utils.userCtx);
        }
        if (callback) {
            callback(err, resp);
        }
    });
};


/**
 * Creates a new user document with given username and password.
 *
 * @name signup(username, password, callback, options)
 * @param {String} username
 * @param {String} password
 * @param {Array} roles
 * @param {Function} callback
 * @param {Hash} options
 * @api public
 */

exports.signup = function (username, password, roles, callback) {
    users.create(username, password, roles, callback);
};
