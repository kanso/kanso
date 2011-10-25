var couchdb = require('./couchdb'),
    settings = require('./settings'),
    cache = require('./cache'),
    utils = require('./utils'),
    logger = require('./logger'),
    semver = require('node-semver/semver'),
    async = require('async'),
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

    doc.time.modified = utils.ISODateString(now);
    doc.time[cfg.version] = utils.ISODateString(now);

    doc.versions[cfg.version] = cfg;

    var versions = Object.keys(doc.versions);
    // semver.rcompare not working here for some reason
    var highest = versions.sort(semver.compare).reverse()[0];

    if (highest === cfg.version) {
        doc.tags = doc.tags || {};
        doc.tags.latest = cfg.version;

        doc.name = cfg.name;
        doc.author = cfg.author;
        doc.website = cfg.website;
        doc.maintainers = cfg.maintainers;
        doc.description = cfg.description;
    }

    exports.attachTar(doc, cfg, tfile, callback);
};


exports.createDoc = function (user, cfg, tfile, callback) {
    var now = new Date();
    var doc = {
        _id: cfg.name,
        name: cfg.name,
        type: 'package',
        submitted_by: user,
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
    cache.clear(cfg.name, cfg.version, function (err) {
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
    var user = '';
    var parsed = url.parse(repository);
    if (parsed.auth) {
        user = parsed.auth.split(':')[0];
    }
    exports.readSettings(path, function (err, cfg) {
        if (err) {
            return callback(err);
        }
        async.series({
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
                return exports.createDoc(user, cfg, tfile, function (err, doc) {
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

exports.unpublish = function (repository, name, version, options, callback) {
    if (!callback) {
        callback = options;
        options = {};
    }
    var user = '';
    var parsed = url.parse(repository);
    if (parsed.auth) {
        user = parsed.auth.split(':')[0];
    }

    var db = couchdb(repository);

    function removeVersionFromCache(v) {
        return function (err) {
            if (err) {
                return callback(err);
            }
            cache.clear(name, v, callback);
        };
    }

    function removeVersion(v, data) {
        delete data.versions[v];
        delete data._attachments[name + '-' + v + '.tar.gz'];
        delete data.time[v];
        data.time.modified = utils.ISODateString(new Date());

        if (data.tags['latest'] === v) {
            var versions = Object.keys(data.versions).sort(semver.compare);
            data.tags['latest'] = versions[versions.length - 1];
        }

        if (Object.keys(data.versions).length) {
            db.save(name, data, removeVersionFromCache(v));
        }
        else {
            // no more version remaining
            db.delete(name, data._rev, removeVersionFromCache());
        }
    }
    exports.get(repository, name, function (err, data) {
        if (err) {
            return callback(err);
        }
        if (!data) {
            return callback('No entry exists for ' + name);
        }
        if (!version) {
            return db.delete(name, data._rev, removeVersionFromCache());
        }
        if (data.versions && data.versions[version]) {
            return removeVersion(version, data);
        }
        if (data.tags && data.tags[version]) {
            var v = data.tags[version];
            if (version !== 'latest') {
                delete data.tags[version];
            }
            return removeVersion(v, data);
        }
        return callback('No entry exists for ' + name + ' ' + version);
    });
};


exports.CACHE = {};

exports.resolve = function (name, version, repositories, callback) {
    if (!repositories || !repositories.length) {
        return callback(new Error('No repositories specified'));
    }

    function readData(data, repository) {
        if (data.versions && version in data.versions) {
            callback(null, version, data, repository);
        }
        else if (data.tags && version in data.tags) {
            callback(null, data.tags[version], data, repository);
        }
        else {
            var versions = Object.keys(data.versions).sort(semver.compare);
            var max = semver.maxSatisfying(versions, version);
            if (max) {
                callback(null, max, data, repository);
            }
            else {
                var e = new Error(
                    'No package for ' + name + ' @ ' + version + '\n' +
                    'Available versions: ' + versions.join(', ')
                );
                e.missing = true;
                e.versions = versions;
                throw e;
            }
        }
    }

    var available_versions = [];

    function checkRepo(repository, next) {
        if (!repository) {
            return next();
        }
        if (!exports.CACHE[repository]) {
            exports.CACHE[repository] = {};
        }

        // use cached copy of document if available
        if (exports.CACHE[repository][name]) {
            return readData(exports.CACHE[repository][name], repository);
        }

        var db = couchdb(repository);
        db.get(name, function (err, data, res) {
            if (err) {
                if (res.statusCode === 404) {
                    return next();
                }
                return callback(err);
            }
            exports.CACHE[repository][name] = data;
            try {
                readData(data, repository);
            }
            catch (e) {
                if (e.missing) {
                    available_versions = available_versions.concat(e.versions);
                    return next();
                }
                else {
                    throw e;
                }
            }
        });
    }

    var i = 0;
    var nextfn = function () {
        i++;
        if (i < repositories.length) {
            checkRepo(repositories[i], nextfn);
        }
        else if (available_versions.length) {
            return callback(new Error(
                'No package for ' + name + ' @ ' + version + '\n' +
                'Available versions: ' + available_versions.join(', ')
            ));
        }
        else {
            return callback(new Error('No package found for ' + name));
        }
    };
    checkRepo(repositories[i], nextfn);
};


// data argument is an optional cached package document from a previous call to
// repository.resolve to avoid multiple db.get calls if possible

exports.fetch = function (name, version, repositories,
        /*optional*/data, /*optional*/ repository, callback) {

    logger.debug('fetching', name + ' (' + version + ')');

    if (!callback) {
        callback = repository;
        repository = null;
    }
    if (!callback) {
        callback = data;
        data = null;
    }

    cache.get(name, version, function (err, tarfile, cachedir) {
        if (cachedir && tarfile) {
            settings.load(cachedir, function (err, cfg) {
                if (err) {
                    return callback(err);
                }
                callback(null, tarfile, cachedir, version, cfg, true);
            });
            return;
        }

        function getVersion(v, data, repository) {
            cache.get(name, v, function (err, c_tfile, c_cdir) {
                if (err) {
                    return callback(err);
                }
                if (c_tfile && c_cdir) {
                    settings.load(cachedir, function (err, cfg) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, c_tfile, c_cdir, v, cfg, true);
                    });
                    return;
                }
                var filename = name + '-' + v + '.tar.gz';
                var url = repository + '/' + name + '/' + filename;
                //logger.info('downloading', filename);
                logger.info('downloading', url);
                exports.download(url, function (err, tarfile) {
                    if (err) {
                        return callback(err);
                    }
                    cache.moveTar(name, v, tarfile,
                        function (err, tfile, cdir) {
                            var cfg = data.versions[v];
                            callback(err, tfile, cdir, v, cfg);
                        }
                    );
                });
            });
        }

        if (data) {
            getVersion(version, data, repository);
        }
        else {
            exports.resolve(name, version, repositories, function (err, v, data, repository) {
                if (err) {
                    return callback(err);
                }
                getVersion(v, data, repository);
            });
        }
    });
};


exports.download = function (file, callback) {
    var target = exports.TMP_DIR + '/' + path.basename(file);
    var urlinfo = url.parse(file);
    var proto = (urlinfo.protocol === 'https:') ? https: http;

    var _cb = callback;
    callback = function (err) {
        var that = this;
        var args = arguments;
        if (err) {
            utils.rm('-rf', target, function (err) {
                if (err) {
                    // let the original error through, but still output this one
                    logger.error(err);
                }
                _cb.apply(that, args);
            });
            return;
        }
        _cb.apply(that, args);
    };

    utils.ensureDir(exports.TMP_DIR, function (err) {
        if (err) {
            return callback(err);
        }
        var headers = {};
        if (urlinfo.auth) {
            var auth = decodeURIComponent(urlinfo.auth);
            var enc = new Buffer(auth).toString('base64');
            headers.Authorization = "Basic " + enc;
        }
        var request = proto.request({
            host: urlinfo.hostname,
            port: urlinfo.port,
            method: 'GET',
            path: urlinfo.pathname,
            headers: headers
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
