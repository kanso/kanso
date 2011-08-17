var utils = require('../utils'),
    packages = require('../packages'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    argParse = require('../args').parse,
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


exports.summary = 'Upload the kanso admin app to a CouchDB instance';

exports.usage = '' +
'kanso pushadmin [OPTIONS] DB\n' +
'\n' +
'Parameters:\n' +
'  DB     The CouchDB instance to upload the app to\n' +
'\n' +
'Options:\n' +
'  --minify    Compress CommonJS modules attachment using UglifyJS';


exports.run = function (settings, args) {
    var a = argParse(args, {
        'minify': {match: '--minify'}
        //'minify_attachments': {match: '--minify-attachments'},
        //'baseURL': {match: '--baseURL', value: true}
    });
    if (!a.positional[0]) {
        return logger.error('No CouchDB URL specified');
    }
    var dir = __dirname + '/../../admin';
    var url = a.positional[0].replace(/\/$/, '');
    if (!/^http/.test(url)) {
        if (url.indexOf('@') !== -1 && url.indexOf('/') === -1) {
            url = 'http://' + url.split('@')[0] + '@localhost:5984/' +
                  url.split('@').slice(1).join('@');
        }
        else {
            url = 'http://localhost:5984/' + url;
        }
    }
    exports.loadApp(dir, url, a.options, function (err, appurl, url, cfg) {
        if (err) {
            return logger.error(err);
        }
        logger.end(
            appurl + '/_design/' +
            cfg.name + '/_rewrite/'
        );
    });
};

exports.loadApp = function (dir, url, options, callback) {
    var paths = [__dirname + '/../../packages'];
    packages.load(dir, true, paths, null, options, function (err, doc, cfg) {
        if (err) {
            if (callback) {
                return callback(err);
            }
            else {
                return logger.error(err);
            }
        }
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
            parsed.auth += ':' + password;
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
            var appurl = urlParse(url);
            delete appurl.auth;
            delete appurl.host;
            appurl = urlFormat(appurl);
            if (callback) {
                callback(null, appurl, url, cfg);
            }
            else {
                logger.end(
                    appurl + '/_design/' +
                    cfg.name + '/_rewrite/'
                );
            }
        });
    });
};
