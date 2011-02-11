/**
 * Module dependencies
 */

var db = require('./db');


/**
 * Logs out the current user.
 *
 * @param {Function} callback
 */

// TODO: add unit tests for this function
exports.logout = function (callback) {
    if (!exports.isBrowser) {
        throw new Error('logout cannot be called server-side');
    }
    db.request({
        type: "DELETE",
        url: "/_session", // don't need baseURL, /_session always available
        username: "_",
        password : "_",
    }, callback);
};
