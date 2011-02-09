/*global window: false, $: false, pageTracker: false */

/**
 * bootstrapped kanso code,
 * required before the commonjs environment is available.
 */

(function (exports) {

    exports.getBaseURL = function () {
        var re = new RegExp('(.*\\/_rewrite).*$');
        var match = re.exec(window.location.pathname);
        if (match) {
            return match[1];
        }
        return '';
    };

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

    exports.getPropertyPath = function (obj, p) {
        // normalize to remove unessecary . and .. from paths
        var parts = exports.normalizePath(p).split('/');

        // if path is empty, return the root object
        if (!p) {
            return obj;
        }

        // loop through all parts of the path, throwing an exception
        // if a property doesn't exist
        var a = obj;
        for (var i = 0; i < parts.length; i += 1) {
            var x = parts[i];
            if (a[x] === undefined) {
                throw new Error('Invalid path: ' + p);
            }
            a = a[x];
        }
        return a;
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
            if (!exports.design_doc) {
                throw new Error('no design doc loaded');
            }
            var path;
            if (target.charAt(0) === '.') {
                var dir = exports.dirname(current);
                path = exports.normalizePath(dir + '/' + target);
            }
            else {
                path = exports.normalizePath(target);
            }
            if (!exports.moduleCache[path]) {
                var module = {exports: {}};
                var fn;
                eval('fn = (function (module, exports, require) {' +
                    exports.getPropertyPath(exports.design_doc, path) +
                '});');
                fn(module, module.exports, exports.createRequire(path));
                exports.moduleCache[path] = module.exports;
            }
            return exports.moduleCache[path];
        };
    };

    if (typeof require === 'undefined') {
        // make require available globally, unless already in a commonjs
        // environment
        this.require = exports.createRequire('');
    }

    exports.hashUnescape = function (hash) {
        return hash.replace(/%2F/g, '/');
    };

    exports.init = function () {
        // fetch design_doc and handle current URL
        $.getJSON(exports.getBaseURL() + '/_designdoc', function (data) {
            exports.design_doc = data;
            exports.name = exports.design_doc.settings.name;

            // load the rest of the kanso module
            var kanso = require('kanso/core');
            for (var k in kanso) {
                if (kanso.hasOwnProperty(k)) {
                    exports[k] = kanso[k];
                }
            }
            kanso.init(exports.design_doc);
        });
    };

    // run init function if in the browser
    if (typeof module === 'undefined') {
        exports.init();
    }

}((typeof exports === 'undefined') ? this.kanso = {}: module.exports));
