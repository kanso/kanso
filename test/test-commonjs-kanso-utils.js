var modules = require('../lib/modules'),
    fs = require('fs');

var context = {window: {}, kanso: {design_doc: {}}, console: console};

var m_dir = __dirname + '/../commonjs/kanso';
var utils = modules.require({}, {
    'kanso': {
        'utils': fs.readFileSync(m_dir + '/utils.js').toString(),
        'settings': 'module.exports = {};'
    },
}, '/', 'kanso/utils', context);


exports['getBaseURL - browser'] = function (test) {
    // TODO: update this so it changes isBrowser on the utils module instead
    // this is probably why this test is failing
    utils.isBrowser = true;
    var testpath = function (p) {
        context.window.location = {pathname: p};
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
    test.done();
};

exports['getBaseURL - couchdb no request'] = function (test) {
    utils.isBrowser = false;
    test.throws(function () {
        utils.getBaseURL();
    });
    test.done();
};
