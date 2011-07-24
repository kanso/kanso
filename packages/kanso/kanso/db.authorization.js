/*global $: false, kanso: true */

/**
 * Contains functions for querying and storing data in CouchDB.
 *
 * @module
 */

/**
 * Module dependencies
 */

var core = require('./db.core');

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

    exports.userDb(function (err, userdb) {
        if (err) {
            return callback(err);
        }
        var req = {
            type: 'DELETE',
            url: '/' + exports.encode(userdb) + '/' + exports.encode(id),
            contentType: 'application/json'
        };
        core.request(req, callback);
    });
};


