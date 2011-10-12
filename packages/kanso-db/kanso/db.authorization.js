/*global $: false, kanso: true */

/**
 * Contains functions for querying and storing data in CouchDB.
 *
 * @module
 */

/**
 * Module dependencies
 */

var core = require('./db.core'),
    utils = require('kanso/utils'),
    sha1 = require('sha1'),
    _ = require('underscore')._;


/**
 * Returns the authentication database for the current user's session.
 *
 * @name authDb(callback)
 * @param {Function} callback
 * @api public
 */

var authDb = function(callback) {
    core.request({
        type: "GET",
        url: "/_session"
    },
    function (err, resp) {
        if(err) {
            callback(err, null);
        } else {
            callback(null, resp.info.authentication_db);
        }
    });
};


/**
 * Deletes an existing user document, given its username. You
 * must be logged in as an administrative user for this function
 * to succeed.
 *
 * @name deleteUser(username, callback)
 * @param {String} username
 * @param {Function} callback
 * @api public
 */

exports.deleteUser = function (username, callback) {
    var deleteUser = function(authDb, id, user, callback) {
        core.request({
            type: 'DELETE',
            url: '/' + core.encode(authDb) + '/' + core.encode(id) + '?rev=' + core.encode(user._rev),
            contentType: 'application/json'
        }, callback);
    };
    
    var deleteAdmin = function(username, callback) {
        core.request({
            type: 'DELETE',
            url: '/_config/admins/' + username,
            contentType: 'application/json'
        }, callback);                    
    };
    
    exports.getUser(username, function(err, user, options) {
        if (err) { return callback(err); }
        
        core.request({
            type: 'GET',
            url: '/_config/admins/' + username,
            contentType: 'application/json'                
        }, function(err, admin) {
            if (err) {
                if (err.status !== 404) {
                    return callback(err);
                }
                deleteUser(options.authDb, options.id, user, callback);
            } else {
                deleteAdmin(username, function(err) {
                    if (err) { return callback(err); }
                    deleteUser(options.authDb, options.id, user, callback);                        
                });
            }                
        });
    });
};


/**
 * Get a single user by username.
 *
 * @name getUser(username, callback)
 * @param {String} username
 * @param {Function} callback
 * @api public
 */
 
exports.getUser = function(username, callback) {
    var id = 'org.couchdb.user:' + username;
    
    authDb(function (err, authDb) {
        if (err) { return callback(err); }
        
        core.request({
            type: 'GET',
            url: '/' + core.encode(authDb) + '/' + core.encode(id),
            contentType: 'application/json'
        }, function(err, user) {
            callback(err, user, {authDb: authDb, id: id});
        });
    });
};


/**
 * Lists users.
 *
 * @name listUsers(callback)
 * @param {Function} callback
 * @api public
 */

exports.listUsers = function(callback, options) {
    if(options && options.include_docs) {
        var include_docs = 'true';
    } else {
        var include_docs = 'false';
    }
    
    authDb(function (err, authDb) {
        if (err) {
            callback(err, null);
        }
        var req = {
            type: 'GET',
            url: '/' + core.encode(authDb) + '/_all_docs?include_docs=' + include_docs,
            contentType: 'application/json'
        };
        core.request(req, function(err, result) {
            if(err) {
                callback(err, null);
            } else {
                var users = _(result.rows).select(function(row) {
                    return row.id.match(/org\.couchdb\.user/);
                });
                callback(null, users);
            }
        });
    });    
};




var createUser = function(username, password, roles, callback) {
    var doc = {};
    doc._id = 'org.couchdb.user:' + username;
    doc.name = username;
    doc.type = 'user';
    doc.roles = roles;
    
    core.newUUID(100, function (err, uuid) {
        if (err) { return callback(err); }

        doc.salt = uuid;
        doc.password_sha = sha1.hex(password + doc.salt);

        authDb(function (err, authdb) {
            if (err) { return callback(err); }

            var url = '/' + authdb + '/' + doc._id;
            var req = {
                type: 'PUT',
                url: url,
                data: JSON.stringify(doc),
                processData: false,
                contentType: 'application/json'
            };
            core.request(req, callback);
        });
    });
};

var createAdmin = function(username, password, callback) {
    var url = '/_config/admins/' + username;
    var req = {
        type: 'PUT',
        url: url,
        data: JSON.stringify(password),
        processData: false,
        contentType: 'application/json'
    };

    core.request(req, function() { createUser(username, password, [], callback) });
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

exports.createUser = function (username, password, roles, callback) {
    if(!callback) { callback = roles; roles = []; }
    
    if(roles[0] == "_admin") {
        createAdmin(username, password, callback);
    } else {
        createUser(username, password, roles, callback);
    }
};