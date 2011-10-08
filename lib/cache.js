var tar = require('./tar'),
    utils = require('./utils'),
    async = require('../deps/async'),
    path = require('path');


exports.CACHE_DIR = process.env.HOME + '/.kanso/cache';


exports.add = function (name, version, path, callback) {
    var filename = name + '-' + version + '.tar.gz';
    var dir = exports.dir(name, version);
    var tarfile = dir + '/' + filename
    var cachedir = dir + '/package';

    utils.ensureDir(dir, function (err) {
        if (err) {
            return callback(err);
        }
        async.parallel([
            async.apply(utils.cp, '-r', path, cachedir),
            async.apply(tar.create, tarfile, path)
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
    var tarfile = dir + '/' + filename
    var cachedir = dir + '/package';

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
    var tarfile = dir + '/' + filename
    var cachedir = dir + '/package';

    async.series([
        async.apply(utils.ensureDir, dir),
        async.apply(utils.rm, '-rf', cachedir),
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
    utils.rm('-rf', dir, callback);
};
