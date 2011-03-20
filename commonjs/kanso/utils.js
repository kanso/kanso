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
 * isArray function from underscore.js
 * http://documentcloud.github.com/underscore
 */

exports.isArray = Array.isArray || function (obj) {
    return !!(obj && obj.concat && obj.unshift && !obj.callee);
};

/**
 * isFunction from underscore.js
 * http://documentcloud.github.com/underscore
 */

exports.isFunction = function(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
};


/**
 * Traverses an object and its sub-objects using an array of property names.
 */

exports.getPropertyPath = function (obj, path) {
    if (!path.length || !obj) {
        return obj;
    }
    return exports.getPropertyPath(obj[path.shift()], path);
};

exports.setPropertyPath = function (obj, path, val) {
    if (!path.length) {
        throw new Error('No property path given');
    }
    if (path.length === 1) {
        obj[path[0]] = val;
        return;
    }
    var next = path.shift();
    if (obj[next] === undefined) {
        obj[next] = {};
    }
    else if (typeof obj[next] !== 'object' && path.length) {
        throw new Error('Property path conflicts with existing value');
    }
    exports.setPropertyPath(obj[next], path, val);
};

exports.constructorName = function (obj) {
    if (obj === null || obj === undefined) {
        return undefined;
    }
    if (obj.constructor.name) {
        return obj.constructor.name;
    }
    var match = /function (.+)\(/.exec(obj.constructor.toString());
    return (match && match.length > 1) ? match[1] : undefined;
};
