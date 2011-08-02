var packages = require('../lib/packages'),
    settings = require('../lib/settings'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger');

logger.clean_exit = true;


var fixtures_dir = __dirname + '/fixtures';
var packages_dir = fixtures_dir + '/packages';
var packages2_dir = fixtures_dir + '/packages2';


exports['resolve full path'] = function (test) {
    var p = packages_dir + '/one';
    packages.resolve(p, [], null, function (err, path) {
        if (err) {
            return test.done(err);
        }
        test.equal(path, p);
        test.done();
    });
};

exports['resolve non-existing path'] = function (test) {
    var p = fixtures_dir + '/foo/bar';
    packages.resolve(p, [], null, function (err, path) {
        test.ok(err);
        test.equal(err.message, "Cannot find package '" + p + "'");
        test.done();
    });
};

exports['resolve relative path'] = function (test) {
    var p = packages_dir + '/one';
    var relpath = './' + utils.relpath(p, process.cwd());
    packages.resolve(relpath, [], process.cwd(), function (err, path) {
        if (err) {
            return test.done(err);
        }
        test.equal(path, p);
        test.done();
    });
};

exports['resolve using multiple lookup paths'] = function (test) {
    var paths = [packages_dir, packages2_dir];
    packages.resolve('two', paths, null, function (err, path) {
        if (err) {
            return test.done(err);
        }
        test.equal(path, packages2_dir + '/two');
        test.done();
    });
};

exports['resolve earlier paths take precedence'] = function (test) {
    var paths = [packages_dir, packages2_dir];
    packages.resolve('one', paths, null, function (err, p) {
        if (err) {
            return test.done(err);
        }
        test.equal(p, packages_dir + '/one');
        test.done();
    });
};
