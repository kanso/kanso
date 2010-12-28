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
