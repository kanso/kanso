var utils = require('../utils'),
    packages = require('../packages'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    exec = require('child_process').exec,
    path = require('path'),
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


exports.summary = 'Load a project and push to a CouchDB database';

exports.usage = '' +
'kanso push [PATH] [DB]\n' +
'\n' +
'Parameters:\n' +
'  PATH    Path to project directory to push (defaults to ".")\n' +
'  DB      The CouchDB database to upload the app to, will use "default"\n' +
'          env set in .kansorc if none provided and .kansorc exists\n' +
'\n' +
'Options:\n' +
'  --minify    Compress CommonJS modules attachment using UglifyJS';


exports.run = function (settings, args) {
    var a = argParse(args, {
        'minify': {match: '--minify'},
        'open': {match: '--open'},
        'baseURL': {match: '--baseURL', value: true}
    });
    var url;
    var dir = a.positional[0] || '.';
    path.exists(dir, function (exists) {
        if (!exists) {
            dir = process.cwd();
            url = a.positional[0];
        }
        dir = utils.abspath(dir);
        kansorc.extend(settings, dir + '/.kansorc', function (err, settings) {
            if (err) {
                return logger.error(err);
            }
            if (a.options.hasOwnProperty('baseURL')) {
                settings.baseURL = a.options.baseURL;
            }

            if (a.positional.length > 1) {
                url = a.positional[1];
            }
            else if (a.positional.length && !exists) {
                url = a.positional[0];
            }
            if (!url) {
                if (settings.env.default) {
                    url = settings.env.default.db;
                }
                else {
                    return logger.error('No CouchDB URL specified');
                }
            }
            else {
                url = url.replace(/\/$/, '');
            }

            if (!/^http/.test(url)) {
                if (url in settings.env) {
                    var env = settings.env[url];
                    url = env.db;
                    a.options.minify = a.options.minify || env.minify
                    if (a.options.baseURL !== null &&
                        env.hasOwnProperty('baseURL')) {
                        settings.baseURL = a.options.baseURL = env.baseURL;
                    }
                }
                else {
                    if (url.indexOf('@') !== -1 && url.indexOf('/') === -1) {
                        url = 'http://' + url.split('@')[0] + '@localhost:5984/' +
                              url.split('@').slice(1).join('@');
                    }
                    else {
                        url = 'http://localhost:5984/' + url;
                    }
                }
            }
            exports.loadApp(dir, url, a.options, settings,
                function (err, url, cfg, doc) {
                    if (err) {
                        return logger.error(err);
                    }
                    var newurl= urlParse(url);
                    delete newurl.auth;
                    delete newurl.host;
                    var ddoc_url = urlFormat(newurl) + '/_design/' + cfg.name;

                    var app_url = ddoc_url;
                    if (cfg.index) {
                        // if there's an index property in kanso.json
                        app_url = ddoc_url + cfg.index;
                    }
                    if (cfg.hasOwnProperty('baseURL')) {
                        // if there is a custom baseURL defined
                        newurl.pathname = cfg.baseURL + '/';
                        app_url = urlFormat(newurl);
                    }
                    else if (doc.rewrites && doc.rewrites.length) {
                        app_url = ddoc_url + '/_rewrite/';
                    }
                    else if (doc._attachments && doc._attachments['index.html']) {
                        app_url = ddoc_url + '/index.html';
                    }
                    else if (doc._attachments && doc._attachments['index.htm']) {
                        app_url = ddoc_url + '/index.htm';
                    }

                    if (a.options.open) {
                        if (process.platform === 'linux') {
                            cmd = 'xdg-open';
                        }
                        else {
                            // OSX
                            cmd = 'open';
                        }
                        console.log('Opening URL in browser...');
                        exec(cmd + ' ' + app_url, function (err, so, se) {
                            if (err) {
                                return logger.error(err);
                            }
                            logger.end(utils.noAuthURL(app_url));
                        });
                    }
                    else {
                        logger.end(utils.noAuthURL(app_url));
                    }
                }
            );
        });
    });
};

exports.loadApp = function (dir, url, options, settings, callback) {
    var paths = settings.package_paths || [];
    var parent_dir = path.dirname(dir);
    if (path.basename(parent_dir) === 'packages') {
        paths.push(parent_dir);
    }
    var build_start = new Date().getTime();
    packages.load(dir, true, paths, null, options, function (err, doc, cfg) {
        if (err) {
            if (callback) {
                return callback(err);
            }
            else {
                return logger.error(err);
            }
        }
        var build_end = new Date().getTime();
        console.log('Build complete: ' + (build_end - build_start) + 'ms');
        exports.push(dir, cfg, doc, url, callback);
    });
};

exports.authError = function (err, dir, cfg, doc, url, callback) {
    logger.error(err);
    if (err.response && err.response.statusCode === 401) {
        utils.getAuth(url, function (err, url) {
            if (err) {
                if (calback) {
                    return callback(err);
                }
                else {
                    return logger.error(err);
                }
            }
            exports.push(dir, cfg, doc, url, callback);
        });
    }
};

exports.push = function (dir, cfg, doc, url, callback) {
    var parsed = urlParse(url);
    // if only a username has been specified, ask for password
    if (parsed.auth && parsed.auth.split(':').length === 1) {
        utils.getPassword(function (err, password) {
            delete parsed.host;
            parsed.auth += ':' + encodeURIComponent(password);
            url = urlFormat(parsed);
            exports.push(dir, cfg, doc, url, callback);
        });
        return;
    }
    var db = couchdb(url);
    db.ensureDB(function (err) {
        if (err) {
            return exports.authError(err, dir, cfg, doc, url, callback);
        }
        var id = '_design/' + cfg.name;
        logger.info('Uploading...');
        db.save(id, doc, {force: true}, function (err) {
            if (err) {
                return exports.authError(err, dir, cfg, doc, url, callback);
            }
            callback(null, url, cfg, doc);
        });
    });
};
