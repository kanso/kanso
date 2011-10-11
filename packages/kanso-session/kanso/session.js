/**
 * Functions related to the management of user sessions and account information.
 *
 * @module
 */

/**
 * Module dependencies
 */

var db = require('kanso/db'),
    sha1 = require('sha1'),
    cookies = require('kanso/cookies'),
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
 * Returns the authentication database for the current user's session.
 *
 * @name userDb(callback)
 * @param {Function} callback
 * @api public
 */

exports.userDb = function (callback) {
    if (utils.session && utils.session.authentication_db) {
        return callback(null, utils.session.authentication_db);
    }
    exports.info(function (err, session) {
        callback(err, session ? session.info.authentication_db: null);
    });
};



var signupUser = function(username, password, roles, callback) {
    var doc = {};
    doc._id = 'org.couchdb.user:' + username;
    doc.name = username;
    doc.type = 'user';
    doc.roles = roles;
    
    db.newUUID(100, function (err, uuid) {
        if (err) {
            return callback(err);
        }
        doc.salt = uuid;
        doc.password_sha = sha1.hex(password + doc.salt);
        exports.userDb(function (err, userdb) {
            if (err) {
                return callback(err);
            }
            var url = '/' + userdb + '/' + doc._id;
            var req = {
                type: 'PUT',
                url: url,
                data: JSON.stringify(doc),
                processData: false,
                contentType: 'application/json'
            };
            db.request(req, callback);
        });
    });
};

var signupAdmin = function(username, password, callback) {
    var url = '/_config/admins/' + username;
    var req = {
        type: 'PUT',
        url: url,
        data: JSON.stringify(password),
        processData: false,
        contentType: 'application/json'
    };

    db.request(req, function() { signupUser(username, password, [], callback) });
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
    if(!callback) { callback = roles; roles = []; }
    
    if(roles[0] == "_admin") {
        signupAdmin(username, password, callback);
    } else {
        signupUser(username, password, roles, callback);
    }
};