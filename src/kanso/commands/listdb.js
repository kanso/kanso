var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    async = require('async'),
    path = require('path'),
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format,
    _ = require('underscore/underscore')._;


exports.summary = 'List databases on a CouchDB instance';

exports.usage = '' +
'kanso listdb [URL]\n' +
'\n' +
'Where URL is either a URL for the desired Couch instance or\n' +
'blank for localhost:5984:\n' +
'\n' +
'kanso createdb\n' +
'kanso createdb http://hostname:port\n' +
'kanso createdb http://username@hostname:port\n' +
'kanso createdb http://username:password@hostname:port\n' +
'\n' +
'Parameters:\n' +
'  URL    The URL of the CouchDB instance to list databases from\n' +
'\n' +
'Options:\n' +
'  -l    Show extra details for each database: doc count and size on disk';




exports.run = function (settings, args, commands) {
    var a = argParse(args, {
        'details': {match: ['-l']}
    });
    var couchdb_url = a.positional[0] || 'http://localhost:5984';

    // /_all_dbs is at the root couchdb instance level, not the db level
    var parsed = url.parse(couchdb_url);
    delete parsed.pathname;
    delete parsed.query;
    delete parsed.search;
    var db = couchdb(url.format(parsed));

    exports.listdb(couchdb_url, function (err, list, url) {
        var db = couchdb(url);
        var colwidth = _.max(list.map(function (l) {
            return l.length;
        }));
        async.forEachSeries(list, function (l, cb) {
            if (a.options.details) {
                db.client('GET', l, {}, function (err, info) {
                    if (err) {
                        if (err.error === 'unauthorized') {
                            console.log(l);
                            return cb();
                        }
                        return cb(err);
                    }
                    //console.log(info);
                    console.log(
                        utils.padRight(l, colwidth + 4) +
                        utils.padRight(info.doc_count + ' docs', 16) +
                        utils.formatSize(info.disk_size)
                    );
                    cb();
                });
            }
            else {
                console.log(l);
                process.nextTick(cb);
            }
        },
        function (err) {
            if (err) {
                return logger.error(err);
            }
            logger.clean_exit = true;
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
            console.log('');
            exports.listdb(url, callback);
        });
    }
};

exports.listdb = function (url, callback) {
    var parsed = urlParse(url);
    // if only a username has been specified, ask for password
    if (parsed.auth && parsed.auth.split(':').length === 1) {
        utils.getPassword(function (err, password) {
            delete parsed.host;
            parsed.auth += ':' + encodeURIComponent(password);
            url = urlFormat(parsed);
            console.log('');
            exports.listdb(url, callback);
        });
        return;
    }
    var db = couchdb(url);
    db.allDbs(function (err, list) {
        if (err) {
            return exports.authError(err, url, callback);
        }
        callback(null, list, url);
    });
};
