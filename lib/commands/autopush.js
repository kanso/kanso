var kanso = require('../kanso'),
    couchdb = require('../couchdb'),
    logger = require('../logger'),
    argParse = require('../args').parse,
    utils = require('../utils'),
    modules = require('../modules'),
    attachments = require('../attachments'),
    templates = require('../templates'),
    settings = require('../settings'),
    urlParse = require('url').parse,
    urlFormat = require('url').format,
    watch = require('../../deps/watch/main'),
    push = require('./push');



// throttle calls to loadApp so we don't push too often... waits for a short
// time before pushing to allow all watch events to fire.
var waiting = false;

var loadApp = function () {
    var that = this;
    var args = arguments;
    if (!waiting) {
        waiting = true;
        setTimeout(function () {
            waiting = false;
            push.loadApp.apply(that, args);
        }, 500);
    }
};


exports.summary = 'Upload a project, then watch files for changes';
exports.usage = '' +
'kanso autopush [OPTIONS] DB [PATH]\n' +
'\n' +
'Parameters:\n' +
'  DB     The CouchDB instance to upload the app to\n' +
'  PATH   The project path to load the app from\n' +
'\n' +
'Options:\n' +
'  --minify               Compress CommonJS modules using UglifyJS\n' +
'  --minify-attachments   Compress .js attachments\n' +
'  --baseURL PATH         Force the baseURL to a specific value.\n' +
'                         (allows vhosts on CouchDB < v1.1.x)';

exports.run = function (args) {
    var a = argParse(args, {
        'minify': {match: '--minify'},
        'minify_attachments': {match: '--minify-attachments'},
        'baseURL': {match: '--baseURL', value: true}
    });
    if (!a.positional[0]) {
        return logger.error('No CouchDB URL specified');
    }
    var dir = a.positional[1] || '.';
    settings.load(dir, function (err, settings) {
        if (err) {
            return logger.error(err);
        }
        settings.minify = a.options.minify;
        settings.minify_attachments = a.options.minify_attachments;
        if (a.options.baseURL !== undefined) {
            settings.baseURL = a.options.baseURL || '';
        }
        var url = a.positional[0].replace(/\/$/, '');
        push.loadApp(dir, settings, url, function (err, appurl, fullurl) {
            if (err) {
                return logger.error(err);
            }
            // keep auth details in url
            url = fullurl;
            logger.success(
                appurl + '/_design/' +
                settings.name + '/_rewrite/'
            );
            exports.watch(
                settings.modules,
                modules.filenameFilter(dir),
                dir,
                settings,
                url
            );
            exports.watch(
                settings.templates,
                templates.filenameFilter(dir),
                dir,
                settings,
                url
            );
            exports.watch(
                settings.attachments,
                attachments.filenameFilter(dir),
                dir,
                settings,
                url
            );
        });
    });
};

exports.watch = function (paths, filter, dir, settings, url) {
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    var opts = {
        interval: 1000,
        filter: filter
    };
    paths.forEach(function (p) {
        watch.watchTree(dir + '/' + p, opts, function (f, curr, prev) {
            if (typeof f == "object" && prev === null && curr === null) {
                // Finished walking the tree
                logger.info('Watching', p);
            }
            else {
                if (filter(f)) {
                    /*if (prev === null) {
                        // f is a new file
                        logger.info('Added', f);
                    }
                    else if (curr.nlink === 0) {
                        // f was removed
                        logger.info('Removed', f);
                    }
                    else {
                        // f was changed
                        logger.info('Changed', f);
                    }*/
                    logger.info('Changed', f);
                    loadApp(dir, settings, url, function (err, appurl, fullurl) {
                        if (err) {
                            return logger.error(err);
                        }
                        // keep auth details in url
                        url = fullurl;
                        logger.success(
                            appurl + '/_design/' +
                            settings.name + '/_rewrite/'
                        );
                    });
                }
            }
        });
    });
};
