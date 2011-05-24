var utils = require('kanso/utils');


exports['getBaseURL - browser'] = function (test) {
    // TODO: update this so it changes isBrowser on the utils module instead
    // this is probably why this test is failing
    utils.isBrowser = true;
    var _getWindowLocation = utils.getWindowLocation;
    var testpath = function (p) {
        utils.getWindowLocation = function () { return {pathname: p}; };
        return utils.getBaseURL();
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
    utils.getWindowLocation = _getWindowLocation;
    utils.isBrowser = true;
    test.done();
};

exports['getBaseURL - couchdb no vhost'] = function (test) {
    utils.isBrowser = false;
    var testpath = function (p) {
        return utils.getBaseURL({path: p, headers: {}});
    };
    test.equal(
        testpath(['db','_design','doc','_show','testshow']),
        '/db/_design/doc/_rewrite'
    );
    test.equal(
        testpath(['db','_design','doc','_list','testlist']),
        '/db/_design/doc/_rewrite'
    );
    test.equal(
        testpath(['db','_design','doc']),
        '/db/_design/doc/_rewrite'
    );
    utils.isBrowser = true;
    test.done();
};

exports['getBaseURL - couchdb with vhost'] = function (test) {
    utils.isBrowser = false;
    var testpath = function (p) {
        var req = {
            path: ['db','_design','doc','_show','testshow'],
            headers: {'x-couchdb-vhost-path': p}
        };
        return utils.getBaseURL(req);
    };
    test.equal(testpath('/'), '');
    test.equal(testpath('/some/path'), '');
    utils.isBrowser = true;
    test.done();
};

exports['getBaseURL - couchdb no request'] = function (test) {
    utils.isBrowser = false;
    test.throws(function () {
        utils.getBaseURL();
    });
    utils.isBrowser = true;
    test.done();
};

exports['getPropertyPath'] = function (test) {
    var obj = {some: {nested: {path: 'yay'}}};
    test.equal(utils.getPropertyPath(obj, ['some','nested','path']), 'yay');
    test.same(utils.getPropertyPath(obj, ['some','nested']), {path: 'yay'});
    test.strictEqual(
        utils.getPropertyPath(obj, ['some','nested','missing']),
        undefined
    );
    test.strictEqual(
        utils.getPropertyPath(obj, ['blah','blah','blah']),
        undefined
    );
    utils.isBrowser = true;
    test.done();
};
