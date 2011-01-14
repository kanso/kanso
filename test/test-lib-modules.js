var modules = require('../lib/modules'),
    utils = require('../lib/utils'),
    fs = require('fs');


exports['load'] = function (test) {
    var doc = {settings: {modules: 'lib'}};
    var _find = modules.find;
    modules.find = function (p, cb) {
        cb(null, ['file1','file2','file3']);
    };
    var _addFiles = modules.addFiles;
    modules.addFiles = function (dir, files, doc, cb) {
        test.equal(dir, 'dir');
        test.same(files, ['file1','file2','file3']);
        modules.addFiles = function (dir, files, doc, cb) {
            // called again to add default commonjs dir
            cb();
        };
        cb();
    };
    modules.load('dir', doc, function (err) {
        test.ifError(err);
        modules.find = _find;
        modules.addFiles = _addFiles;
        test.done();
    });
};

exports['load multiple dirs'] = function (test) {
    var doc = {settings: {modules: ['lib','deps']}};
    var find_calls = [];
    var _find = modules.find;
    modules.find = function (p, cb) {
        find_calls.push(p);
        cb(null, ['file']);
    };
    var _addFiles = modules.addFiles;
    modules.addFiles = function (dir, files, doc, cb) {
        test.same(files, ['file','file']);
        modules.addFiles = function (dir, files, doc, cb) {
            // called again to add default commonjs dir
            cb();
        };
        cb();
    };
    modules.load('dir', doc, function (err) {
        test.ifError(err);
        // the last find call is to add default commonjs dir
        test.same(find_calls.slice(0,2), ['dir/lib','dir/deps']);
        modules.find = _find;
        modules.addFiles = _addFiles;
        test.done();
    });
};

exports['addFiles'] = function (test) {
    var doc = {};
    var files = ['dir/lib/file1.js', 'dir/lib/file2.js', 'dir/deps/file3.js'];
    var _readFile = fs.readFile;
    fs.readFile = function (p, cb) {
        cb(null, p.substr(-4,1));
    };
    modules.addFiles('dir', files, doc, function (err) {
        test.ifError(err);
        test.same(doc, {
            'lib': {
                'file1': '1',
                'file2': '2'
            },
            'deps': {
                'file3': '3'
            }
        });
        fs.readFile = _readFile;
        test.done();
    });
};

exports['find'] = function (test) {
    var _descendants = utils.descendants;
    utils.descendants = function (p, callback) {
        return callback(null, [
            '.one.js',
            'two.js',
            'three',
            'dir/subdir/file.js',
            'dir/.hiddendir/file.js',
            '/home/user/project/file.js',
            '/home/user/project/.file.js',
            '.example.js.swp'
        ]);
    };
    modules.find('p', function (err, files) {
        test.ifError(err);
        test.same(files, [
            'two.js',
            'dir/subdir/file.js',
            '/home/user/project/file.js'
        ]);
        utils.descendants = _descendants;
        test.done();
    });
};

exports['require'] = function (test) {
    var module_cache = {};
    var doc = {
        lib: {
            testlib: "exports.hello = function (name) {\n" +
            "    return 'hello ' + name;\n" +
            "};"
         },
         other: {
            lib2: "exports.hi = function (name) {\n" +
            "    return 'hi ' + name;\n" +
            "};"
         },
         testlib: "exports.hello = function () { return 'root'; };"
    };
    test.equals(
        modules.require(
            module_cache, doc, '/', 'lib/testlib'
        ).hello('world'),
        'hello world'
    );
    test.equals(
        modules.require(
            module_cache, doc, '/lib', './testlib'
        ).hello('world'),
        'hello world'
    );
    test.equals(
        modules.require(
            module_cache, doc, '/lib', 'testlib'
        ).hello('world'),
        'root'
    );
    test.equals(
        modules.require(
            module_cache, doc, '/lib', '../other/lib2'
        ).hi('world'),
        'hi world'
    );
    test.throws(function () {
        modules.require(
            module_cache, doc, '/lib', '../../app2/lib/asdf'
        );
    });
    test.equals(module_cache['/other/lib2'].hi('test'), 'hi test');
    test.done();
};

exports['require within a module'] = function (test) {
    var module_cache = {};
    var doc = {
        lib: {
            name: "exports.name = 'world';\n",
            hello: "var name = require('./name').name;\n" +
            "exports.hello = function () {\n" +
            "    return 'hello ' + name;\n" +
            "};"
         }
    };
    test.equals(
        modules.require(module_cache, doc, '/lib','./name').name,
        'world'
    );
    test.equals(module_cache['/lib/name'].name, 'world');
    test.throws(function () {
        modules.require(module_cache, doc, '/lib','hello').hello();
    });
    test.equals(
        modules.require(module_cache, doc, '/lib','./hello').hello(),
        'hello world'
    );
    test.done();
};

exports['require missing module'] = function (test) {
    test.expect(1);
    var doc = {
        lib: {
            hello: "var name = require('../name').name;\n" +
            "exports.hello = function () {\n" +
            "    return 'hello ' + name;\n" +
            "};"
         }
    };
    try {
        modules.require({}, doc, '/lib','./hello').hello();
    }
    catch (e) {
        test.equals(e.message, 'Could not require module: ../name');
    }
    test.done();
};
