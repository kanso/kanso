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
    var id = 'org.couchdb.user:' + username;

    authDb(function (err, authDb) {
        if (err) { callback(err); }
    
        core.request({
            type: 'GET',
            url: '/' + core.encode(authDb) + '/' + core.encode(id),
            contentType: 'application/json'
        }, function(err, user) {
            if(err) { callback(err); }
    
            core.request({
                type: 'GET',
                url: '/_config/admins/' + username,
                contentType: 'application/json'                
            }, function(err, admin) {
                if(!err) {                    
                    core.request({
                        type: 'DELETE',
                        url: '/_config/admins/' + username,
                        contentType: 'application/json'
                    }, function() {});
                }
            });
    
            core.request({
                type: 'DELETE',
                url: '/' + core.encode(authDb) + '/' + core.encode(id) + '?rev=' + core.encode(user._rev),
                contentType: 'application/json'
            }, callback);            
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