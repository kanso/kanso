var init = require('../static/init');


exports['normalizePath'] = function (test) {
    test.equal(init.normalizePath('some/path'), 'some/path');
    test.equal(init.normalizePath('./some/path'), 'some/path');
    test.equal(init.normalizePath('some/../path'), 'path');
    test.equal(init.normalizePath('some/../path/../test'), 'test');
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
