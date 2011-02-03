var kanso = require('../kanso'),
    couchdb = require('../couchdb'),
    logger = require('../logger'),
    argParse = require('../args').parse,
    utils = require('../utils'),
    settings = require('../settings'),
    urlParse = require('url').parse,
    urlFormat = require('url').format;


exports.summary = 'Upload a project to a CouchDB instance';
exports.usage = '' +
'kanso push [OPTIONS] DB [PATH]\n' +
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
        if ('baseURL' in a.options) {
            settings.baseURL = a.options.baseURL || '';
        }
        var url = a.positional[0].replace(/\/$/, '');
        exports.loadApp(dir, settings, url);
    });
};

exports.loadApp = function (dir, settings, url) {
    kanso.load(dir, settings, function (err, doc) {
        if (err) {
            return logger.error(err);
        }
        exports.push(dir, settings, doc, url);
    });
};

/* replaced after first attempt */
exports.authError = function (err, dir, settings, doc, url) {
    if (err.response && err.response.statusCode === 401) {
        utils.getAuth(url, function (err, url) {
            if (err) {
                return logger.error(err);
            }
            exports.authError = function (err) {
                logger.error(err);
            }
            exports.push(dir, settings, doc, url);
        });
    }
};

exports.push = function (dir, settings, doc, url) {
    var db = couchdb(url);
    db.ensureDB(function (err) {
        if (err) {
            return exports.authError(err, dir, settings, doc, url);
        }
        var id = '_design/' + settings.name;
        logger.info('Uploading...');
        db.save(id, doc, {force: true}, function (err) {
            if (err) {
                return exports.authError(err, dir, settings, doc, url);
            }
            var appurl = urlParse(url);
            delete appurl.auth;
            delete appurl.host;
            appurl = urlFormat(appurl);
            logger.end(
                appurl + '/_design/' +
                settings.name + '/_rewrite/'
            );
        });
    });
};
