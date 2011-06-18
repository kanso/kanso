var data = require('../data'),
    logger = require('../logger'),
    utils = require('../utils'),
    argParse = require('../args').parse,
    couchdb = require('../couchdb'),
    async = require('../../deps/async'),
    urlParse = require('url').parse,
    urlFormat = require('url').format;


exports.summary = 'Push a file or directory of JSON files to DB';
exports.usage = '' +
'kanso pushdata [OPTIONS] DB PATH\n' +
'\n' +
'Parameters:\n' +
'  DB     The CouchDB instance to upload the documents to\n' +
'  PATH   A file or directory containing JSON documents to upload\n' +
'\n'+
'Options:\n' +
'  -f, --force      Ignore document conflict errors and upload anyway';


exports.run = function (args) {
    var a = argParse(args, {
        'force': {match: ['--force','-f']}
    });
    if (!a.positional[0]) {
        logger.error('No CouchDB URL specified');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    if (!a.positional[1]) {
        logger.error('No data file or directory specified');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    var path = a.positional[1] || '.';
    var url = a.positional[0];
    url = url.search(/^http/) != -1 ? url : 'http://localhost:5984/' + url;
    var db = couchdb(url);
    db.ensureDB(function (err) {
        if (err) {
            return exports.authError(path, url, a.options, callback);
        }
        exports.pushDocs(path, url, a.options, function (err) {
            if (err) {
                // errors now reported per-file
                //return logger.error(err);
                return;
            }
            logger.end('uploads complete');
        });
    });
};

exports.authError = function (err, dir, settings, doc, url, callback) {
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
            logger.info(
                'Saved ' + (res._id || res.id) +
                ' (' + path + ', entry: ' + i + ')'
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
            parsed.auth += ':' + password;
            url = urlFormat(parsed);
            exports.pushDocs(path, url, options, callback);
        });
        return;
    }
    data.eachDoc(path, function (p, docs, cb) {
        logger.info('Loaded ' + p);
        if (!Array.isArray(docs)) {
            docs = [docs];
        }
        var i = 0;
        async.forEach(docs, function (doc, cb) {
            exports.pushDoc(p, url, doc, i, options, function (err) {
                cb(err);
            });
            i++;
        }, cb);
    }, callback);
}
