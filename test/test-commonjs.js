var modules = require('../lib/modules'),
    fs = require('fs');

var context = {window: {}};

var kanso = modules.require({}, {
    'kanso': fs.readFileSync(__dirname + '/../commonjs/kanso.js').toString(),
    'templates': '// templates module'
}, '/', 'kanso', context);


exports['getBaseURL'] = function (test) {
    var testpath = function (p) {
        context.window.location = {pathname: p};
        return kanso.getBaseURL();
    };
    test.equal(testpath('/'), '');
    test.equal(testpath('/some/path'), '');
    test.equal(
        testpath('/db/_design/doc/_rewrite/'),
        '/db/_design/doc/_rewrite'
    );
    test.equal(
        testpath('/db/_design/doc/_rewrite/some/path'),
        '/db/_design/doc/_rewrite'
    );
    test.done();
};

exports['getURL using pathname'] = function (test) {
    var testpath = function (p) {
        context.window.location = {pathname: p};
        return kanso.getURL();
    };
    test.equal(testpath('/'), '/');
    test.equal(testpath('/some/path'), '/some/path');
    test.equal(testpath('/db/_design/doc/_rewrite/'), '/');
    test.equal(testpath('/db/_design/doc/_rewrite/some/path'), '/some/path');
    test.done();
};

exports['getURL using hash'] = function (test) {
    var testpath = function (p, h) {
        context.window.location = {pathname: p, hash: h};
        return kanso.getURL();
    };
    test.equal(testpath('/', '#/'), '/');
    test.equal(testpath('/', '#/some/path'), '/some/path');
    test.equal(testpath('/db/_design/doc/_rewrite/','#/'), '/');
    test.equal(
        testpath('/db/_design/doc/_rewrite/','#/some/path'),
        '/some/path'
    );
    test.done();
};

exports['getURL hash priority over pathname'] = function (test) {
    var testpath = function (p, h) {
        context.window.location = {pathname: p, hash: h};
        return kanso.getURL();
    };
    test.equal(testpath('/other/path', '#/'), '/');
    test.equal(testpath('/other/path', '#/some/path'), '/some/path');
    test.equal(testpath('/db/_design/doc/_rewrite/other/path','#/'), '/');
    test.equal(
        testpath('/db/_design/doc/_rewrite/other/path','#/some/path'),
        '/some/path'
    );
    test.done();
};
