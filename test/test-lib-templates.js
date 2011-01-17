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
    templates.load('dir', doc, function (err) {
        test.ok(err instanceof Error);
        test.done();
    });
};

exports['addFiles'] = function (test) {
    var doc = {settings: {templates: 'templates'}};
    var files = [
        'dir/lib/file1.html',
        'dir/lib/file2.html',
        'dir/deps/file3.html'
    ];
    var _readFile = fs.readFile;
    fs.readFile = function (p, cb) {
        if (/dust\.js$/.test(p)) {
            return cb(null, 'dustsrc');
        }
        cb(null, p.substr(-6,1));
    };
    var _compile = dust.compile;
    dust.compile = function (src) {
        return 'tmpl' + src;
    };
    templates.addFiles('dir', files, doc, function (err) {
        test.ifError(err);
        test.same(doc, {
            'settings': {
                'templates': 'templates'
            },
            'kanso': {
                'templates': 'dustsrctmpl1tmpl2tmpl3'
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
            'dir/.swp',
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
