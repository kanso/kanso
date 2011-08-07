var logger = require('../logger'),
    utils = require('../utils'),
    argParse = require('../args').parse,
    couchdb = require('../couchdb'),
    async = require('../../deps/async'),
    json = require('../data-stream'),
    urlParse = require('url').parse,
    urlFormat = require('url').format,
    events = require('events'),
    fs = require('fs');


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


exports.run = function (settings, args, commands) {
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
    exports.pushDocs(path, url, a.options, function (err) {
        if (err) {
            // errors now reported per-file
            //return logger.error(err);
            return;
        }
        logger.end('Uploads complete');
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
    var db = couchdb(url);
    db.ensureDB(function (err) {
        if (err) {
            return exports.authError(err, path, url, options, function (err) {
                if (err) {
                    // errors now reported per-file
                    //return logger.error(err);
                    return;
                }
                logger.end('Uploads complete');
            });
        }
        exports.readFile(path, url, options, callback);
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
                    console.log('Uploaded ' + successful + ' docs');
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
    function show_end_info() {
        if (successful % 100 !== 0) {
            console.log('Uploaded ' + successful + ' docs');
        }
        if (total === successful) {
            logger.end('Uploaded ' + successful + ' of ' + total + ' docs');
        }
        else {
            logger.error('Uploaded ' + successful + ' of ' + total + ' docs');
        }
    }
    pstream.on('end', function () {
        if (waiting <= 0) {
            show_end_info();
        }
        else {
            ev.on('doc_pushed', function () {
                if (waiting <= 0) {
                    show_end_info();
                }
            });
        }
    });
    rstream.pipe(pstream);
    rstream.resume();
};
