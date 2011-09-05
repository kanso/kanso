var couchdb = require('./couchdb'),
    settings = require('./settings'),
    cache = require('./cache'),
    utils = require('./utils'),
    async = require('../deps/async'),
    fs = require('fs');


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


exports.publish = function (path, repository, callback) {
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
                return callback(
                    'Entry already exists for ' + cfg.name + ' ' + cfg.version
                );
            }
            return exports.updateDoc(curr, cfg, tfile, function (err, doc) {
                db.save(cfg.name, doc, callback);
            });
        });
    });
};
