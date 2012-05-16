var tar = require('./tar'),
    utils = require('./utils'),
    async = require('async'),
    path = require('path'),
    env = require('./env');


exports.CACHE_DIR = env.home + '/.kanso/cache';


exports.add = function (name, version, path, callback) {
    var filename = name + '-' + version + '.tar.gz';
    var dir = exports.dir(name, version);
    var tarfile = path.resolve(dir,filename);
    var cachedir = path.resolve(dir,'package');

    utils.ensureDir(dir, function (err) {
        if (err) {
            return callback(err);
        }
        async.series([
            async.apply(tar.create, tarfile, path),
            async.apply(tar.extract, tarfile)
        ],
        function (err) {
            if (err) {
                return callback(err);
            }
            callback(null, tarfile, cachedir);
        });
    });
};

exports.get = function (name, version, callback) {
    var filename = name + '-' + version + '.tar.gz';
    var dir = exports.dir(name, version);
    var tarfile = path.resolve(dir,filename);
    var cachedir = path.resolve(dir,'package');

    path.exists(cachedir, function (exists) {
        if (exists) {
            return callback(null, tarfile, cachedir);
        }
        else {
            // Package not found in cache, return null
            return callback(null, null, null);
        }
    });
};

exports.moveTar = function (name, version, path, callback) {
    var filename = name + '-' + version + '.tar.gz';
    var dir = exports.dir(name, version);
    var tarfile = path.resolve(dir,filename);
    var cachedir = path.resolve(dir,'package');

    async.series([
        async.apply(utils.ensureDir, dir),
        async.apply(utils.rm, cachedir),
        async.apply(utils.mv, path, tarfile),
        async.apply(tar.extract, tarfile)
    ],
    function (err) {
        if (err) {
            return callback(err);
        }
        callback(null, tarfile, cachedir);
    });
};

exports.dir = function (name, version) {
    return exports.CACHE_DIR + '/' + name + '/' + version;
};

exports.clear = function (name, version, callback) {
    if (!callback) {
        callback = version;
        version = null;
    }
    if (!callback) {
        callback = name;
        name = null;
    }
    var dir;
    if (!name) {
        dir = exports.CACHE_DIR;
    }
    else if (!version) {
        dir = exports.CACHE_DIR + '/' + name;
    }
    else {
        dir = exports.CACHE_DIR + '/' + name + '/' + version;
    }
    utils.rm(dir, callback);
};

exports.update = function (name, version, path, callback) {
    exports.clear(name, version, function (err) {
        if (err) {
            return callback(err);
        }
        exports.add(name, version, path, callback);
    });
};
