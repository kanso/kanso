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
    stream = require('stream'),
    path_lib = require('path'),
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
'  -f, --force      Ignore document conflict errors and upload anyway' +
'  -d, --json-dirs  Treat directories as one document';


exports.run = function (settings, args, commands) {
    var a = argParse(args, {
        'force': {match: ['--force','-f']},
        'json_dirs': {match: ['--json-dirs','-d']}
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
        url = utils.argToEnv(settings, url).db;
        utils.completeAuth(url, false, function (err, url) {
            if (err) {
                return logger.error(err);
            }
            var db = couchdb(url);
            utils.catchAuthError(
                exports.pushDocs, url, [path, a.options],
                function (err) {
                    // errors now reported per-file
                }
            );
        });
    });
};

exports.pushDoc = function (url, path, doc, i, options, callback) {
    var db = couchdb(url);
    // TODO: add option which allows pushing docs without ids?
    if (!doc._id) {
        return logger.error('No _id defined for ' + path);
    }
    db.save(doc._id, doc, {force: options.force}, function (err, res) {
        if (!err) {
            logger.info('Saved',
                //(res._id || res.id) + ' (' + path + ', entry: ' + i + ')'
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

exports.pushDocs = function (url, path, options, callback) {
    var db = couchdb(url);
    db.ensureDB(function (err) {
        if (err) {
            return callback(err);
        }

        var finder = exports.find;
        var reader = exports.readFile;
        if (options.json_dirs) {
            finder = exports.find_json;
            reader = exports.readFileRecursive;
        }

        console.log('Uploading docs to ' + utils.noAuthURL(url));
        console.error('Opts: ' + JSON.stringify(options))
        finder(path, function (err, files) {
            if (err) {
                return callback(err);
            }
            var all_successful = 0;
            var all_total = 0;

            async.forEachSeries(files, function (f, cb) {
                logger.info('Reading', f);
                reader(f, url, options, function (err, succ, total) {
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

exports.pushDocStream = function (rstream, url, path, options, callback) {
    var pstream = json.createParseStream();

    var total = 0;
    var successful = 0;
    var waiting = 0;
    var ev = new events.EventEmitter();

    pstream.on('doc', function (doc) {
        rstream.pause();
        waiting++;
        total++;
        exports.pushDoc(url, path, doc, total, options, function (err) {
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

exports.readFile = function (path, url, options, callback) {
    var rstream = fs.createReadStream(path);
    rstream.pause();
    exports.pushDocStream(rstream, url, path, options, callback);
};

exports.readDir = function (path, url, options, callback) {
    var rstream = createJSONDirStream(path);
    rstream.pause();
    exports.pushDocStream(rstream, url, path, options, callback);
};

exports.readFileRecursive = function (path, url, options, callback) {
    fs.stat(path, function (err, stats) {
        if (err) {
            callback(err);
        }
        else if (stats.isDirectory()) {
            exports.readDir(path, url, options, callback);
        }
        else if (stats.isFile()) {
            exports.readFile(path, url, options, callback);
        }
        else {
            return callback(new Error('Not a file or directory: ' + path));
        }
    });
};

function createJSONDirStream(path) {
    var rstream = new stream.Stream;
    rstream.writable = false;
    rstream.readable = true;

    rstream.pending = [];
    rstream.setEncoding = function() {};
    rstream.pause = function() { rstream.paused = true };
    rstream.resume = function() {
        rstream.paused = false;
        rstream.flush();
    };

    function emit(type, value) {
        rstream.pending.push([type, value]);
        rstream.flush();
    }

    var data = [];
    rstream.flush = function () {
        if (!rstream.paused && rstream.pending.length > 0) {
            var oldest = rstream.pending.shift(),
                type = oldest[0],
                value = oldest[1];

            if(type === 'data') {
                data.push(oldest[1]);
            }
            else {
                //console.error('EMIT: ' + type + ': ' + require('util').inspect(value))
                rstream.emit(type, value);
            }
            rstream.flush();
        }
    };

    function end() {
        if (data.length) {
            rstream.emit('data', data.join(''));
        }
        rstream.emit('end');
    }

    readdir(path, 0);
    return rstream;

    function readdir(dir, depth) {
        // Introduce a new object.
        console.error('readdir: ' + dir)
        emit('data', '{');

        fs.readdir(dir, function(err, files) {
            if (err) {
                return emit('error', err);
            }

            var key_number = 0;
            async.forEachSeries(files, readfile, function(err) {
                if (err) {
                    return emit('error', err);
                }
                emit('data', '}');
                if(depth === 0) {
                    end();
                }
            });

            function readfile(file, file_callback, x) {
                var path = path_lib.join(dir, file);
                fs.stat(path, function(err, stats) {
                    if (err) {
                        file_callback(err);
                    }

                    if (file[0] === '.') {
                        return file_callback();
                    }

                    key_number += 1;
                    if (key_number > 1) {
                        emit('data', ',');
                    }

                    var key_name = file.replace(/\.\w+$/, '');
                    emit('data', JSON.stringify(key_name));
                    emit('data', ':');

                    if (stats.isDirectory()) {
                        readdir(path, depth + 1);
                    }
                    if (stats.isFile()) {
                        fs.readFile(path, 'utf8', function (err, data) {
                            if (err) {
                                return file_callback(err);
                            }

                            // .json files are imported directly, but otherwise
                            // their contents are represented as JSON (often a
                            // quoted string).
                            if(/\.json$/.test(file)) {
                                data = JSON.parse(data);
                            }
                            else {
                                try {
                                    data = JSON.parse(data);
                                } catch (parse_err) {
                                    // Nothing to do, keep data as a string.
                                }

                                // Strip the newline from special values.
                                if (depth === 0 && (file === '_id' || file === '_rev')) {
                                    data = data.trimRight();
                                }
                            }
                            emit('data', JSON.stringify(data));
                            file_callback();
                        });
                    }
                    else {
                        logger.error('Unknown file: ' + path);
                    }
                });
            }
        });
    }
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
 * Find .json files and directories at a given path
 *
 * @param {String} p - the path to search
 * @param {Function} callback
 */

exports.find_json = function (p, callback) {
    var is_json_file = exports.filenameFilter(p);

    fs.stat(p, function (err, stats) {
        if (err) {
            return callback(err);
        }

        else if (stats.isFile()) {
            callback(null, p);
        }

        else if (stats.isDirectory()) {
            // Get everything one level deep in here.
            fs.readdir(p, function (err, files) {
                if (err) {
                    return callback(err);
                }
                var paths = files.map(function (f) {
                    return path_lib.join(p, f);
                });
                async.filter(paths, is_json_or_dir, function(paths) {
                    return callback(null, paths)
                });

                function is_json_or_dir(path, filter_callback) {
                    fs.stat(path, function(err, stats) {
                        if (err) {
                            return callback(err);
                        }
                        if (stats.isDirectory()) {
                            return filter_callback(true);
                        }
                        if (stats.isFile() && is_json_file(path)) {
                            return filter_callback(true);
                        }
                        else {
                            return filter_callback(false);
                        }
                    });
                }
            });
        }
    });
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
