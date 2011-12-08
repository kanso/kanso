var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


exports.summary = 'Create a new CouchDB database';

exports.usage = '' +
'kanso createdb DB\n' +
'\n' +
'Where DB is either a URL to the desired DB, the name of a database\n' +
'you\'d like to create on localhost:5984, or an evironment name in\n' +
'your .kansorc:\n' +
'\n' +
'kanso createdb dbname\n' +
'kanso createdb user@dbname\n' +
'kanso createdb user:password@dbname\n' +
'kanso createdb http://hostname:port/dbname\n' +
'kanso createdb http://user:password@hostname:port/dbname\n' +
'kanso createdb environment\n' +
'\n' +
'Parameters:\n' +
'  DB      The URL or name of the CouchDB database to create'


exports.run = function (settings, args) {
    var a = argParse(args, {});
    var url;

    kansorc.extend(settings, './.kansorc', function (err, settings) {
        if (err) {
            return logger.error(err);
        }

        if (!a.positional[0]) {
            if (settings.env.default) {
                url = settings.env.default.db;
            }
            else {
                return logger.error('No CouchDB URL specified');
            }
        }
        else {
            url = a.positional[0].replace(/\/$/, '');
        }

        if (!/^http/.test(url)) {
            if (url in settings.env) {
                var env = settings.env[url];
                url = env.db;
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
        // createdb
        exports.push(url, function (err, url) {
            if (err) {
                return logger.error(err);
            }
            var newurl = urlParse(url);
            delete newurl.auth;
            delete newurl.host;
            logger.end(urlFormat(newurl));
        });
    });
};

exports.authError = function (err, url, callback) {
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
            exports.push(url, callback);
        });
    }
};

exports.push = function (url, callback) {
    var parsed = urlParse(url);
    // if only a username has been specified, ask for password
    if (parsed.auth && parsed.auth.split(':').length === 1) {
        utils.getPassword(function (err, password) {
            delete parsed.host;
            parsed.auth += ':' + encodeURIComponent(password);
            url = urlFormat(parsed);
            exports.push(url, callback);
        });
        return;
    }
    var db = couchdb(url);
    db.createDB(function (err) {
        if (err) {
            return exports.authError(err, url, callback);
        }
        callback(null, url);
    });
};
