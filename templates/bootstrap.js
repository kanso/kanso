/*global window: true, $: true */

/**
 * bootstrapped kanso code,
 * required before the commonjs environment is available.
 */

(function (exports) {

    exports.moduleCache = {};

    exports.getBaseURL = function () {
        var re = new RegExp('(.*\\/_rewrite).*$');
        var match = re.exec(window.location.pathname);
        if (match) {
            return match[1];
        }
        return '';
    };

    exports.getURL = function () {
        if (window.location.hash) {
            return window.location.hash.substr(1);
        }
        var re = new RegExp('\\/_rewrite(.*)$');
        var match = re.exec(window.location.pathname);
        if (match) {
            return match[1] || '/';
        }
        return window.location.pathname || '/';
    };

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

    exports.require = function (path) {
        if (!exports.design_doc) {
            throw new Error('no design doc loaded');
        }
        // TODO: normalize path after resolving relative to current module
        if (!exports.moduleCache[path]) {
            var module = {exports: {}};
            var fn = eval('(function (module, exports, require) {' +
                exports.getPropertyPath(exports.design_doc, path) +
            '});');
            // TODO: create require with current path defined in closure,
            // instead of passing kanso.require
            fn(module, module.exports, exports.require);
            exports.moduleCache[path] = module.exports;
        }
        return exports.moduleCache[path];
    };

    if (typeof require === 'undefined') {
        // make require available globally, unless already in a commonjs
        // environment
        this.require = exports.require;
    }

    exports.init = function () {
        // fetch design_doc and handle current URL
        $.getJSON(exports.getBaseURL() + '/_designdoc', function (data) {
            exports.design_doc = data;

            // load the rest of the kanso module
            var kanso = exports.require('kanso');
            for (var k in kanso) {
                if (kanso.hasOwnProperty(k)) {
                    exports[k] = kanso[k];
                }
            }

            // if using a URL with hash-state, but client supports replaceState,
            // then switch to replaceState instead.
            if (window.location.hash && window.history.replaceState) {
                window.history.replaceState(
                    {}, window.title, exports.getBaseURL() + exports.getURL()
                );
            }

            exports.handle(exports.design_doc, exports.getURL());

            $('a').live('click', function (ev) {
                var url = $(this).attr('href');
                // TODO: test for external / internal urls
                ev.preventDefault();
                exports.handle(exports.design_doc, url);
                exports.setURL(url);
            });

            window.onpopstate = function (ev) {
                exports.handle(exports.design_doc, exports.getURL());
            };
        });
    };

}((typeof exports === 'undefined') ? this.kanso = {}: module.exports));
