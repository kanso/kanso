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
        cb();
    };
    modules.load('dir', doc, function (err) {
        test.ifError(err);
        test.same(find_calls, ['dir/lib','dir/deps']);
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
