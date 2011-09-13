var couchdb = require('./couchdb'),
    settings = require('./settings'),
    cache = require('./cache'),
    utils = require('./utils'),
    async = require('../deps/async'),
    http = require('http'),
    https = require('https'),
    path = require('path'),
    url = require('url'),
    fs = require('fs');


exports.TMP_DIR = process.env.HOME + '/.kanso/tmp';


exports.readSettings = function (path, callback) {
    settings.load(path, function (err, cfg) {
        if (err) {
            return callback(err);
        }
        if (cfg.name === undefined) {
            return callback(
                new Error('kanso.json missing name property')
            );
        }
        if (cfg.version === undefined) {
            return callback(
                new Error('kanso.json missing version property')
            );
        }
        callback(null, cfg);
    });
};


exports.attachTar = function (doc, cfg, tfile, callback) {
    fs.readFile(tfile, function (err, content) {
        if (err) {
            return callback(err);
        }
        doc._attachments = doc._attachments || {};
        doc._attachments[cfg.name + '-' + cfg.version + '.tar.gz'] = {
            content_type: 'application/x-compressed-tar',
            data: content.toString('base64')
        };
        callback(null, doc);
    });
};


exports.updateDoc = function (doc, cfg, tfile, callback) {
    var now = new Date();

    doc.time.modified = utils.ISODateString(now)
    doc.time[cfg.version] = utils.ISODateString(now);

    doc.versions[cfg.version] = cfg;

    // only do this if latest?
    doc.name = cfg.name;
    doc.author = cfg.author;
    doc.website = cfg.website;
    doc.maintainers = cfg.maintainers;
    doc.description = cfg.description;

    exports.attachTar(doc, cfg, tfile, callback);
};


exports.createDoc = function (cfg, tfile, callback) {
    var now = new Date();
    var doc = {
        _id: cfg.name,
        name: cfg.name,
        type: 'package',
        versions: {},
        time: {
            created: utils.ISODateString(now)
        }
    };
    exports.updateDoc(doc, cfg, tfile, callback);
};


// just returns null if the document doesn't exist
exports.get = function (repository, name, callback) {
    var db = couchdb(repository);
    var id = couchdb.encode(name || '');
    db.client('GET', id, null, function (err, data, res) {
        res = res || {};
        if (res.statusCode !== 404 && err) {
            return callback(err);
        }
        callback(null, (res.statusCode === 200) ? data: null);
    });
};


exports.updateCache = function (cfg, path, callback) {
    cache.remove(cfg.name, cfg.version, function (err) {
        if (err) {
            return callback(err);
        }
        cache.add(cfg.name, cfg.version, path, callback);
    });
};


exports.publish = function (path, repository, /*optional*/options, callback) {
    if (!callback) {
        callback = options;
        options = {};
    }
    exports.readSettings(path, function (err, cfg) {
        if (err) {
            return callback(err);
        }
        async.parallel({
            get: async.apply(exports.get, repository, cfg.name),
            cache: async.apply(exports.updateCache, cfg, path)
        },
        function (err, results) {
            if (err) {
                return callback(err);
            }
            var curr = results.get;
            var tfile = results.cache[0];
            var dir = results.cache[1];

            var db = couchdb(repository);

            if (!curr) {
                return exports.createDoc(cfg, tfile, function (err, doc) {
                    db.save(cfg.name, doc, callback);
                });
            }
            else if (curr.versions && curr.versions[cfg.version]) {
                if (!options.force) {
                    return callback(
                        'Entry already exists for ' + cfg.name + ' ' +
                        cfg.version
                    );
                }
            }
            return exports.updateDoc(curr, cfg, tfile, function (err, doc) {
                db.save(cfg.name, doc, callback);
            });
        });
    });
};


exports.fetch = function (name, version, repository, callback) {
    // TODO: check cache
    var db = couchdb(repository);
    db.get(name, function (err, data) {
        if (err) {
            return callback(err);
        }
        if (version in data.versions) {
            var filename = name + '-' + version + '.tar.gz';
            var url = repository + '/' + name + '/' + filename;
            exports.download(url, function (err, tarfile) {
                if (err) {
                    return callback(err);
                }
                cache.moveTar(name, version, tarfile, callback);
            });
        }
        // TODO check tags
        else {
            callback(new Error(
                'No matching package for ' + name + '@' + version
            ));
        }
    });
};


exports.download = function (file, callback) {
    var target = exports.TMP_DIR + '/' + path.basename(file);
    var urlinfo = url.parse(file);
    var proto = (urlinfo.protocol === 'https:') ? https: http;

    var _cb = callback;
    callback = function (err) {
        if (err) {
            utils.rm('-rf', target, function (err) {
                if (err) {
                    // let the original error through, but still output this one
                    logger.error(err);
                }
                _cb.apply(this, arguments);
            });
            return;
        }
        _cb.apply(this, arguments);
    };

    utils.ensureDir(exports.TMP_DIR, function (err) {
        if (err) {
            return callback(err);
        }
        var request = proto.request({
            host: urlinfo.hostname,
            port: urlinfo.port,
            method: 'GET',
            path: urlinfo.pathname
        });
        request.on('response', function (response) {
            if (response.statusCode >= 300) {
                return callback(couchdb.statusCodeError(response.statusCode));
            }
            var outfile = fs.createWriteStream(target);
            response.on('data', function (chunk) {
                outfile.write(chunk);
            });
            response.on('end', function () {
                outfile.end();
                callback(null, target);
            });
        });
        request.end();
    });
};
