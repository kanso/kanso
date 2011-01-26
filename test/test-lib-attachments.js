var attachments = require('../lib/attachments'),
    utils = require('../lib/utils'),
    fs = require('fs');


exports['load'] = function (test) {
    var doc = {settings: {attachments: 'attachments'}};
    var _find = attachments.find;
    attachments.find = function (p, pdir, cb) {
        cb(null, ['file1','file2','file3']);
    };
    var _addFiles = attachments.addFiles;
    attachments.addFiles = function (dir, files, doc, cb) {
        test.equal(dir, 'dir');
        test.same(files, ['file1','file2','file3']);
        cb();
    };
    attachments.load('dir', doc, function (err) {
        test.ifError(err);
        attachments.find = _find;
        attachments.addFiles = _addFiles;
        test.done();
    });
};

exports['load multiple dirs'] = function (test) {
    var doc = {settings: {attachments: ['lib','deps']}};
    var find_calls = [];
    var _find = attachments.find;
    attachments.find = function (p, pdir, cb) {
        find_calls.push(p);
        cb(null, ['file']);
    };
    var _addFiles = attachments.addFiles;
    attachments.addFiles = function (dir, files, doc, cb) {
        test.same(files, ['file','file']);
        cb();
    };
    attachments.load('dir', doc, function (err) {
        test.ifError(err);
        test.same(find_calls, ['dir/lib','dir/deps']);
        attachments.find = _find;
        attachments.addFiles = _addFiles;
        test.done();
    });
};

exports['addFiles'] = function (test) {
    var doc = {};
    var files = [
        'dir/static/file1.css',
        'dir/static/file2.txt',
    ];
    var _readFile = fs.readFile;
    fs.readFile = function (p, cb) {
        cb(null, {toString: function (enc) {
            test.equal(enc, 'base64');
            return p.substr(-5,1);
        }});
    };
    attachments.addFiles('dir', files, doc, function (err) {
        test.ifError(err);
        test.same(doc, {
            '_attachments': {
                'static/file1.css': {
                    'content_type': 'text/css',
                    'data': '1'
                },
                'static/file2.txt': {
                    'content_type': 'text/plain',
                    'data': '2'
                }
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
            '.project/.one.html',
            'two.html',
            'three',
            'dir/subdir/file.html',
            'dir/.hiddendir/file.html',
            '/home/user/project/file.html',
            '/home/user/project/.file.html',
            '.example.html.swp',
            'static/jquery-1.4.2.min.js'
        ]);
    };
    attachments.find('p', '', function (err, files) {
        test.ifError(err);
        test.same(files, [
            'two.html',
            'three',
            'dir/subdir/file.html',
            '/home/user/project/file.html',
            'static/jquery-1.4.2.min.js'
        ]);
        utils.descendants = _descendants;
        test.done();
    });
};
