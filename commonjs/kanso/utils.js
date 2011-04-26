/*global window: false */

/**
 * Module dependencies
 */

var settings = require('./settings'); // settings module is auto-generated


/**
 * Some functions calculate results differently depending on the execution
 * environment. The isBrowser value is used to set the correct environment
 * for these functions, and is only exported to make unit testing easier.
 *
 * You should not need to change this value during normal usage.
 */

// TODO: this was moved to this module from core.js to avoid a circular
// dependency between core.js and db.js ...once circular dependencies in
// couchdb's commonjs implementation are fixed it can be moved back into
// core.js. For now, this is also exported from core.js and should
// be accessed from there.
exports.isBrowser = false;
if (typeof window !== 'undefined') {
    exports.isBrowser = true;
}

/**
 * This is because the first page hit also triggers kanso to handle the url
 * client-side. Knowing it is the first page being loaded means we can stop
 * the pageTracker code from submitting the URL twice. Exported because this
 * might be useful information to other modules, it should not be modified
 * by them.
 */

// TODO: this was moved to this module from core.js to avoid a circular
// dependency between core.js and session.js
exports.initial_hit = true;



/**
 * Used to store userCtx, periodically updated like on session.login and
 * session.logout. TODO: Or if a permissions error is returned from a db method?
 */

// TODO: added to utils to avoid circular dependency bug in couchdb
exports.userCtx = null;

/**
 * Caches extended session info (like the current authentication db) after
 * a call to session.info
 */
exports.session = null;


/**
 * Returns the path to prefix to any URLs. When running behind a
 * virtual host, there is nothing to prefix URLs with. When accessing the
 * app directly, URLs need to be prefixed with /db/_design/appname/_rewrite.
 *
 * The request object argument is only required when run server-side.
 *
 * @param {Object} req
 * @returns {String}
 * @api public
 */

// TODO: this was moved to this module from core.js to avoid a circular
// dependency between core.js and db.js ...once circular dependencies in
// couchdb's commonjs implementation are fixed it can be moved back into
// core.js. For now, this is also exported from core.js and should
// be accessed from there.
exports.getBaseURL = function (req) {
    if ('baseURL' in settings) {
        return settings.baseURL;
    }
    if (exports.isBrowser) {
        var re = new RegExp('(.*\\/_rewrite).*$');
        var match = re.exec(window.location.pathname);
        if (match) {
            return match[1];
        }
        return '';
    }
    if (req.headers['x-couchdb-vhost-path']) {
        return '';
    }
    return '/' + req.path.slice(0, 3).join('/') + '/_rewrite';
};


/**
 * Traverses an object and its sub-objects using an array of property names.
 * Returns the value of the matched path, or undefined if the property does not
 * exist.
 *
 * getPropertyPath({a: {b: 'foo'}}, ['a','b']) -> 'foo'
 *
 * @param {Object} obj
 * @param {Array} path
 */

exports.getPropertyPath = function (obj, path) {
    if (!path.length || !obj) {
        return obj;
    }
    return exports.getPropertyPath(obj[path[0]], path.slice(1));
};

/**
 * Traverses an object and its sub-objects using an array of property names.
 * Sets the value of the matched property.
 *
 * setPropertyPath({}, ['a','b'], 'foo') -> {a: {b: 'foo'}}
 *
 * @param {Object} obj
 * @param {Array} path
 * @returns undefined
 */

exports.setPropertyPath = function (obj, path, val) {
    if (!path.length) {
        throw new Error('No property path given');
    }
    if (path.length === 1) {
        obj[path[0]] = val;
        return;
    }
    var next = path[0];
    path = path.slice(1);
    if (obj[next] === undefined) {
        obj[next] = {};
    }
    else if (typeof obj[next] !== 'object' && path.length) {
        throw new Error('Property path conflicts with existing value');
    }
    exports.setPropertyPath(obj[next], path, val);
};

/**
 * Returns the name of the constructor function for an object. This is used
 * as a workaround for CouchDB's lack of a module cache, where instanceof checks
 * can break if a module is re-eval'd.
 *
 * @param {Object} obj
 * @returns {String}
 */

exports.constructorName = function (obj) {
    if (obj === null || obj === undefined) {
        return undefined;
    }
    if (obj.constructor.name) {
        return obj.constructor.name;
    }
    var match = new RegExp('function (.+)\\(').exec(obj.constructor.toString());
    return (match && match.length > 1) ? match[1] : undefined;
};


/**
 * Call function with arguments, catch any errors and add to an array,
 * returning the modified array.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Array} args
 * @return {Array}
 * @api private
 */

exports.getErrors = function (fn, args) {
    var arr = []
    try {
        arr = arr.concat(fn.apply(this, args) || []);
    }
    catch (e) {
        arr.push(e);
    }
    return arr;
};
