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
 * @name authdb(callback)
 * @param {Function} callback
 * @api private
 */

var authdb = function(callback) {
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
 * Returns successful if username is in admin database.
 *
 * @name getAdmin(username, callback)
 * @param {String} username
 * @param {Function} callback
 * @api private
 */

var getAdmin = function(username, callback) {
    core.request({
        type: 'GET',
        url: '/_config/admins/' + username,
        contentType: 'application/json'                
    }, callback);
};


/**
 * Delete user from user database.
 *
 * @name deleteUser(authdb, id, user, callback)
 * @param {String} user database
 * @param {String} user id
 * @param {Object} user document
 * @param {Function} callback
 * @api private
 */

var deleteUser = function(authdb, id, user, callback) {
    core.request({
        type: 'DELETE',
        url: '/' + core.encode(authdb) + '/' + core.encode(id) + '?rev=' + core.encode(user._rev),
        contentType: 'application/json'
    }, callback);
};

/**
 * Delete user from admin database.
 *
 * @name deleteAdmin(username, callback)
 * @param {String} username
 * @param {Function} callback
 * @api private
 */

var deleteAdmin = function(username, callback) {
    core.request({
        type: 'DELETE',
        url: '/_config/admins/' + username,
        contentType: 'application/json'
    }, callback);                    
};


/**
 * Save user to user database.
 *
 * @name saveUser(authdb, doc, callback)
 * @param {String} user database
 * @param {Object} user document
 * @param {Function} callback
 * @api private
 */

var saveUser = function(authdb, doc, callback) {
    var url = '/' + authdb + '/' + doc._id;
    var req = {
        type: 'PUT',
        url: url,
        data: JSON.stringify(doc),
        processData: false,
        contentType: 'application/json'
    };
    core.request(req, callback);    
};


/**
 * Create a new user in the user database.
 *
 * @name createUser(username, password, roles, callback)
 * @param {String} username
 * @param {String} password
 * @param {Array} roles
 * @param {Function} callback
 * @api private
 */

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

        authdb(function (err, authdb) {
            if (err) { return callback(err); }
            saveUser(authdb, doc, callback);
        });
    });
};


/**
 * Create a new user in the admin database.
 *
 * @name createAdmin(username, password, callback)
 * @param {String} username
 * @param {String} password
 * @param {Function} callback
 * @api private
 */

var createAdmin = function(username, password, callback) {
    var url = '/_config/admins/' + username;
    var req = {
        type: 'PUT',
        url: url,
        data: JSON.stringify(password),
        processData: false,
        contentType: 'application/json'
    };

    core.request(req, callback);
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
    exports.getUser(username, function(err, user, options) {
        if (err) { return callback(err); }
        
        getAdmin(username, function(err, admin) {
            if (err) {
                if (err.status !== 404) {
                    return callback(err);
                }
                deleteUser(options.authdb, options.id, user, callback);
            } else {
                deleteAdmin(username, function(err) {
                    if (err) { return callback(err); }
                    deleteUser(options.authdb, options.id, user, callback);                        
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
    
    authdb(function (err, authdb) {
        if (err) { return callback(err); }
        
        core.request({
            type: 'GET',
            url: '/' + core.encode(authdb) + '/' + core.encode(id),
            contentType: 'application/json'
        }, function(err, user) {
            callback(err, user, {authdb: authdb, id: id});
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
    
    authdb(function (err, authdb) {
        if (err) {
            callback(err, null);
        }
        var req = {
            type: 'GET',
            url: '/' + core.encode(authdb) + '/_all_docs?include_docs=' + include_docs,
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


/**
 * Creates a new user document with given username and password.
 * If first given role is _admin, user will be made admin.
 *
 * @name createUser(username, password, roles, callback)
 * @param {String} username
 * @param {String} password
 * @param {Array} roles
 * @param {Function} callback
 * @api public
 */

exports.createUser = function (username, password, roles, callback) {
    if(!callback) { callback = roles; roles = []; }
    
    if(roles[0] == "_admin") {
        createAdmin(username, password, function(err) {
            if(err) {
                callback(err);
            } else {
                createUser(username, password, [], callback);
            }
        });
    } else {
        createUser(username, password, roles, callback);
    }
};


/**
 * Update the user.
 *
 * @name updateUser(username, password, roles, callback)
 * @param {String} username
 * @param {String} password
 * @param {Array} roles
 * @param {Function} callback
 * @api public
 */

exports.updateUser = function (username, password, roles, callback) {
    exports.getUser(username, function(err, user, options) {
        if (err) { return callback(err); }
        
        if(roles[0] != "_admin") {
            user.roles = roles;
        }
        if(password) {
            user.password_sha = sha1.hex(password + user.salt);
        }

        saveUser(options.authdb, user, function(err, user) {
            if(roles[0] == "_admin") {
                createAdmin(username, password, function() {
                    callback();
                });
            } else {
                getAdmin(username, function(err, admin) {
                    if (err) {
                        if (err.status !== 404) {
                            return callback(err);
                        }
                        return callback();
                    } else {   
                        deleteAdmin(username, function(err) {
                            if (err) { return callback(err); }

                            callback();
                        });
                    }
                });                
            }
        });
    });
};