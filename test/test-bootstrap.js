var bootstrap = require('../templates/bootstrap');


exports['getBaseURL'] = function (test) {
    var testpath = function (p) {
        global.window = {location: {pathname: p}};
        return bootstrap.getBaseURL();
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
        global.window = {location: {pathname: p}};
        return bootstrap.getURL();
    };
    test.equal(testpath('/'), '/');
    test.equal(testpath('/some/path'), '/some/path');
    test.equal(testpath('/db/_design/doc/_rewrite/'), '/');
    test.equal(testpath('/db/_design/doc/_rewrite/some/path'), '/some/path');
    test.done();
};

exports['getURL using hash'] = function (test) {
    var testpath = function (p, h) {
        global.window = {location: {pathname: p, hash: h}};
        return bootstrap.getURL();
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
        global.window = {location: {pathname: p, hash: h}};
        return bootstrap.getURL();
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

exports['getPropertyPath'] = function (test) {
    var obj = {
        test: 'test',
        some: {
            example: {path: 'val'},
            other: {path: 'val2'}
        },
        example: 'val3'
    };
    test.equals(bootstrap.getPropertyPath(obj, 'test'), 'test');
    test.equals(bootstrap.getPropertyPath(obj, 'some/example/path'), 'val');
    test.same(bootstrap.getPropertyPath(obj, 'some/other'), {path: 'val2'});
    test.equals(bootstrap.getPropertyPath(obj, './some/.././example'), 'val3');
    test.same(bootstrap.getPropertyPath(obj, ''), obj);
    test.done();
};
