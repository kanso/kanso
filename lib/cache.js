var tar = require('./tar'),
    utils = require('./utils'),
    async = require('../deps/async');


exports.CACHE_DIR = process.env.HOME + '/.kanso/cache';


exports.add = function (name, version, path, callback) {
    var filename = name + '-' + version + '.tar.gz';
    var dir = exports.CACHE_DIR + '/' + name + '/' + version;
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

exports.remove = function (name, version, callback) {
    var dir = exports.CACHE_DIR + '/' + name + '/' + version;
    utils.rm('-rf', dir, callback);
};
