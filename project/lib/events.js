/**
 * Bindings to Kanso events
 */

var events = require('kanso/events');


/**
 * The init method fires when the app is initially loaded from a page rendered
 * by CouchDB.
 */

/**
 * events.on('init', function () {
 *     // app initialization code goes here...
 * });
 */


/**
 * The sessionChange event fires when the app is first loaded and the user's
 * session information becomes available. It is also fired whenever a change
 * to the user's session is detected, for example after logging in or out.
 */

/**
 * events.on('sessionChange', function (userCtx, req) {
 *     // session change handling code goes here...
 * });
 */


/**
 * The updateFailure event fires when an update function returns a document as
 * the first part of an array, but the client-side request to update the
 * document fails.
 */

events.on('updateFailure', function (err, info, req, res, doc) {
    alert(err.message || err.toString());
});
