var logger = require('../logger'),
    utils = require('../utils'),
    argParse = require('../args').parse,
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc');
    json = require('../data-stream'),
    async = require('async'),
    urlParse = require('url').parse,
    urlFormat = require('url').format,
    events = require('events'),
    fs = require('fs');


exports.summary = 'Upload a file or directory of JSON files to DB';
exports.usage = '' +
'kanso upload [OPTIONS] PATH [DB]\n' +
'\n' +
'Parameters:\n' +
'  PATH   A file or directory containing JSON documents to upload\n' +
'  DB     The CouchDB database to upload the documents to, if not specified\n' +
'         it will use the "default" env in your .kansorc if available\n' +
'\n'+
'Options:\n' +
'  -f, --force      Ignore document conflict errors and upload anyway';


exports.run = function (settings, args, commands) {
    var a = argParse(args, {
        'force': {match: ['--force','-f']}
    });
    if (!a.positional[0]) {
        logger.error('No data file or directory specified');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    var path = a.positional[0] || '.';
    var url = a.positional[1];

    kansorc.extend(settings, '.kansorc', function (err, settings) {
        if (err) {
            return logger.error(err);
        }

        if (!url) {
            if (settings.env.default) {
                url = settings.env.default.db;
            }
            else {
                logger.error('No CouchDB URL specified');
                logger.info('Usage: ' + exports.usage);
                return;
            }
        }
        url = url.replace(/\/$/, '');

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
        var db = couchdb(url);
        exports.pushDocs(path, url, a.options, function (err) {
            if (err) {
                // errors now reported per-file
                //return logger.error(err);
                return;
            }
        });
    });
};

exports.authError = function (err, path, url, options, callback) {
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
            exports.pushDocs(path, url, options, callback);
        });
    }
};

exports.pushDoc = function (path, url, doc, i, options, callback) {
    var db = couchdb(url);
    // TODO: add option which allows pushing docs without ids?
    if (!doc._id) {
        return logger.error('No _id defined for ' + path);
    }
    db.save(doc._id, doc, {force: options.force}, function (err, res) {
        if (!err) {
            logger.info('Saved',
                (res._id || res.id) + ' (' + path + ', entry: ' + i + ')'
            );
        }
        else {
            logger.error('Error saving ' + path +
                (doc._id ? ' (' + doc._id + ')': '(entry: ' + i + ')')
            );
            logger.error(err);
        }
        callback(err);
    });
};

exports.pushDocs = function (path, url, options, callback) {
    var parsed = urlParse(url);
    // if only a username has been specified, ask for password
    if (parsed.auth && parsed.auth.split(':').length === 1) {
        utils.getPassword(function (err, password) {
            delete parsed.host;
            parsed.auth += ':' + encodeURIComponent(password);
            url = urlFormat(parsed);
            exports.pushDocs(path, url, options, callback);
        });
        return;
    }
    var db = couchdb(url);
    db.ensureDB(function (err) {
        if (err) {
            return exports.authError(err, path, url, options, function (err) {
                if (err) {
                    // errors now reported per-file
                    //return logger.error(err);
                    return;
                }
            });
        }
        console.log('Uploading docs to ' + utils.noAuthURL(url));
        exports.find(path, function (err, files) {
            if (err) {
                return callback(err);
            }
            var all_successful = 0;
            var all_total = 0;

            async.forEachSeries(files, function (f, cb) {
                logger.info('Reading', f);
                exports.readFile(f, url, options, function (err, succ, total) {
                    if (err) {
                        cb(err);
                    }
                    all_successful += succ;
                    all_total += total;
                    if (succ % 100 !== 0) {
                        logger.info('Uploaded ' + succ+ ' docs');
                    }
                    cb();
                });
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
                if (all_total === all_successful) {
                    logger.end(
                        'Uploaded ' + all_successful + ' of ' +
                        all_total + ' docs'
                    );
                }
                else {
                    logger.error(
                        'Uploaded ' + all_successful + ' of ' +
                        all_total + ' docs'
                    );
                }
                callback();
            });
        });
    });
}

exports.readFile = function (path, url, options, callback) {
    var pstream = json.createParseStream();
    var rstream = fs.createReadStream(path);
    rstream.pause();

    var total = 0;
    var successful = 0;
    var waiting = 0;
    var ev = new events.EventEmitter();

    pstream.on('doc', function (doc) {
        rstream.pause();
        waiting++;
        total++;
        exports.pushDoc(path, url, doc, total, options, function (err) {
            if (err) {
                logger.error(err);
            }
            else {
                successful++;
                if (successful % 100 === 0 && successful != 0) {
                    logger.info('Uploaded ' + successful + ' docs');
                }
            }
            waiting--;
            ev.emit('doc_pushed');
            rstream.resume();
        });
    });
    pstream.on('error', function (err) {
        logger.error(err);
    });
    pstream.on('end', function () {
        if (waiting <= 0) {
            callback(null, successful, total);
        }
        else {
            ev.on('doc_pushed', function () {
                if (waiting <= 0) {
                    callback(null, successful, total);
                }
            });
        }
    });
    rstream.pipe(pstream);
    rstream.resume();
};

/**
 * Find all .json files below a given path, recursing through subdirectories
 *
 * @param {String} p - the path to search
 * @param {Function} callback
 */

exports.find = function (p, callback) {
    utils.find(p, exports.filenameFilter(p), callback);
};


/**
 * Creates a filter used when searching for data files. This function tests
 * for a .json extension and omits hidden dot-preceeded filenames.
 *
 * @param {String} p - the path to the directory being searched
 * @returns {Function}
 */

exports.filenameFilter = function (p) {
    return function (f) {
        if (f === p) {
            return true;
        }
        var relpath = utils.relpath(f, p);
        // should not start with a '.'
        if (/^\.[^\/]?/.test(relpath)) {
            return false;
        }
        // should not contain a file or folder starting with a '.'
        if (/\/\./.test(relpath)) {
            return false;
        }
        // should have a .js extension
        if (!/\.json$/.test(f)) {
            return false;
        }
        return true;
    };
};
