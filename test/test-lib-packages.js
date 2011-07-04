var packages = require('../lib/packages'),
    settings = require('../lib/settings'),
    utils = require('../lib/utils');


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

exports['load calls preprocessors'] = function (test) {
    var _loadSettings = settings.load;
    var _resolve = packages.resolve;
    packages.resolve = function (name, paths, source, cb) {
        cb(null, './testpkg');
    };
    var cfg = {
        name: 'testpkg'
    };
    settings.load = function (p, cb) {
        cb(null, cfg);
    };
    var calls = [];
    var plugins = [
        {preprocessors: [
            function (path, settings, doc, callback) {
                test.equal(path, './testpkg');
                test.equal(settings, cfg);
                doc.test = ['one'];
                calls.push(['one', path, settings, doc]);
                callback(null, doc);
            }
        ]},
        {preprocessors: [
            function (path, settings, doc, callback) {
                test.equal(path, './testpkg');
                test.equal(settings, cfg);
                test.same(doc.test, ['one']);
                doc.test.push('two');
                calls.push(['two', path, settings, doc]);
                callback(null, doc);
            },
            function (path, settings, doc, callback) {
                test.equal(path, './testpkg');
                test.equal(settings, cfg);
                test.same(doc.test, ['one', 'two']);
                doc.test.push('three');
                calls.push(['three', path, settings, doc]);
                callback(null, doc);
            }
        ]}
    ];
    packages.load(plugins, './testpkg', [], null, function (err, doc) {
        if (err) {
            return test.done(err);
        }
        console.log(doc);
        test.same(doc.test, ['one', 'two', 'three']);
        packages.resolve = _resolve;
        settings.load = _loadSettings;
        test.done();
    });
};
