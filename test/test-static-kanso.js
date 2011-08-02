var kanso = require('../packages/modules/build/bootstrap');


exports['normalizePath'] = function (test) {
    test.equal(kanso.normalizePath('some/path'), 'some/path');
    test.equal(kanso.normalizePath('./some/path'), 'some/path');
    test.equal(kanso.normalizePath('some/../path'), 'path');
    test.equal(kanso.normalizePath('some/../path/../test'), 'test');
    test.done();
};

exports['dirname'] = function (test) {
    test.equal(kanso.dirname('/'), '/');
    test.equal(kanso.dirname('/test'), '/');
    test.equal(kanso.dirname('/some/path'), '/some');
    test.equal(kanso.dirname('/a/b/c'), '/a/b');
    test.equal(kanso.dirname('a/b/c'), 'a/b');
    test.equal(kanso.dirname('a/b'), 'a');
    test.done();
};
