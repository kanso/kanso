var templates = require('../lib/templates'),
    utils = require('../lib/utils'),
    dust = require('../deps/dustjs/lib/dust'),
    fs = require('fs');


exports['load'] = function (test) {
    var doc = {settings: {templates: 'templates'}};
    var _find = templates.find;
    templates.find = function (p, cb) {
        cb(null, ['file1','file2','file3']);
    };
    var _addFiles = templates.addFiles;
    templates.addFiles = function (dir, files, doc, cb) {
        test.equal(dir, 'dir');
        test.same(files, ['file1','file2','file3']);
        cb();
    };
    templates.load('dir', doc, function (err) {
        test.ifError(err);
        templates.find = _find;
        templates.addFiles = _addFiles;
        test.done();
    });
};

exports['load multiple dirs'] = function (test) {
    var doc = {settings: {templates: ['lib','deps']}};
    var find_calls = [];
    var _find = templates.find;
    templates.find = function (p, cb) {
        find_calls.push(p);
        cb(null, ['file']);
    };
    var _addFiles = templates.addFiles;
    templates.addFiles = function (dir, files, doc, cb) {
        test.same(files, ['file','file']);
        cb();
    };
    templates.load('dir', doc, function (err) {
        test.ifError(err);
        test.same(find_calls, ['dir/lib','dir/deps']);
        templates.find = _find;
        templates.addFiles = _addFiles;
        test.done();
    });
};

exports['addFiles'] = function (test) {
    var doc = {};
    var files = [
        'dir/lib/file1.html',
        'dir/lib/file2.html',
        'dir/deps/file3.html'
    ];
    var _readFile = fs.readFile;
    fs.readFile = function (p, cb) {
        cb(null, p.substr(-6,1));
    };
    var _compile = dust.compile;
    dust.compile = function (src) {
        return 'tmpl' + src;
    };
    templates.addFiles('dir', files, doc, function (err) {
        test.ifError(err);
        test.same(doc, {
            'lib': {
                'file1.html': 'tmpl1',
                'file2.html': 'tmpl2'
            },
            'deps': {
                'file3.html': 'tmpl3'
            }
        });
        fs.readFile = _readFile;
        dust.compile = _compile;
        test.done();
    });
};

exports['find'] = function (test) {
    var _descendants = utils.descendants;
    utils.descendants = function (p, callback) {
        return callback(null, [
            '.one.html',
            'two.html',
            'three',
            'dir/subdir/file.html',
            'dir/.hiddendir/file.html',
            '/home/user/project/file.html',
            '/home/user/project/.file.html',
            '.example.html.swp'
        ]);
    };
    templates.find('p', function (err, files) {
        test.ifError(err);
        test.same(files, [
            'two.html',
            'three',
            'dir/subdir/file.html',
            '/home/user/project/file.html'
        ]);
        utils.descendants = _descendants;
        test.done();
    });
};
