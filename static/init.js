/*global window: false, $: false, pageTracker: false, kanso: true */

/**
 * bootstrapped kanso code,
 * required before the commonjs environment is available.
 */

(function (exports) {

    exports.moduleCache = {};

    exports.normalizePath = function (p) {
        var path = [];
        var parts = p.split('/');
        for (var i = 0; i < parts.length; i += 1) {
            if (parts[i] === '..') {
                path.pop();
            }
            else if (parts[i] !== '.') {
                path.push(parts[i]);
            }
        }
        return path.join('/');
    };

    exports.dirname = function (p) {
        if (p === '/') {
            return p;
        }
        var parts = p.split('/');
        parts.pop();
        if (parts.length === 1 && parts[0] === '') {
            return '/';
        }
        return parts.join('/');
    };

    exports.createRequire = function (current) {
        return function (target) {
            var path;
            if (target.charAt(0) === '.') {
                var dir = exports.dirname(current);
                path = exports.normalizePath(dir + '/' + target);
            }
            else {
                path = exports.normalizePath(target);
            }
            var m = kanso.moduleCache[path];
            if (!m) {
                throw new Error('No such module: ' + path);
            }
            if (!m.loaded) {
                m.exports = {};
                // set this to true *before* calling m.load so circular
                // requires don't blow the call stack
                m.loaded = true;
                m.load(m, m.exports, exports.createRequire(path));
            }
            return m.exports;
        };
    };

    if (typeof require === 'undefined') {
        // make require available globally, unless already in a commonjs
        // environment
        this.require = exports.createRequire('');
    }

    exports.init = function () {
        var kanso = require('kanso/core');
        for (var k in kanso) {
            if (kanso.hasOwnProperty(k)) {
                exports[k] = kanso[k];
            }
        }
        kanso.init();
    };

}((typeof exports === 'undefined') ? this.kanso = {}: module.exports));


/**
 * lib/app.js adds the wrapped and concatenated list of commonjs modules after
 * this code.
 */


