var window = global.window = {};
var init = require('../static/init');


exports['normalizePath'] = function (test) {
    test.equal(init.normalizePath('some/path'), 'some/path');
    test.equal(init.normalizePath('./some/path'), 'some/path');
    test.equal(init.normalizePath('some/../path'), 'path');
    test.equal(init.normalizePath('some/../path/../test'), 'test');
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
    test.equals(init.getPropertyPath(obj, 'test'), 'test');
    test.equals(init.getPropertyPath(obj, 'some/example/path'), 'val');
    test.same(init.getPropertyPath(obj, 'some/other'), {path: 'val2'});
    test.equals(init.getPropertyPath(obj, './some/.././example'), 'val3');
    test.same(init.getPropertyPath(obj, ''), obj);
    test.done();
};

exports['dirname'] = function (test) {
    test.equal(init.dirname('/'), '/');
    test.equal(init.dirname('/test'), '/');
    test.equal(init.dirname('/some/path'), '/some');
    test.equal(init.dirname('/a/b/c'), '/a/b');
    test.equal(init.dirname('a/b/c'), 'a/b');
    test.equal(init.dirname('a/b'), 'a');
    test.done();
};

exports['isAppURL'] = function (test) {
    test.equal(init.isAppURL('/'), true);
    test.equal(init.isAppURL('/some/path'), true);
    test.equal(init.isAppURL('some/path'), true);
    window.location = 'http://hostname:port/';
    test.equal(init.isAppURL('http://hostname:port/some/path'), true);
    test.equal(init.isAppURL('http://hostname:port'), true);
    test.equal(init.isAppURL('http://otherhost:port/some/path'), false);
    test.equal(init.isAppURL('http://otherhost:port'), false);
    test.done();
};
