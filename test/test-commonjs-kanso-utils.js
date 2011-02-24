var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};

module.exports = nodeunit.testCase({

    setUp: function (cb) {
        var that = this;
        testing.testRequire(
            'kanso/utils', mcache, context, {}, function (err, utils) {
                if (err) {
                    return cb(err);
                }
                that.utils = utils;
                cb();
            }
        );
    },

    'getBaseURL - browser': function (test) {
        var utils = this.utils;
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
    },

    'getBaseURL - couchdb no vhost': function (test) {
        var utils = this.utils;
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
    },

    'getBaseURL - couchdb with vhost': function (test) {
        var utils = this.utils;
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
    },

    'getBaseURL - couchdb no request': function (test) {
        var utils = this.utils;
        utils.isBrowser = false;
        test.throws(function () {
            utils.getBaseURL();
        });
        test.done();
    },

    'propertyPath': function (test) {
        var utils = this.utils;
        var obj = {some: {nested: {path: 'yay'}}};
        test.equal(utils.propertyPath(obj, ['some','nested','path']), 'yay');
        test.same(utils.propertyPath(obj, ['some','nested']), {path: 'yay'});
        test.strictEqual(
            utils.propertyPath(obj, ['some','nested','missing']),
            undefined
        );
        test.strictEqual(
            utils.propertyPath(obj, ['blah','blah','blah']),
            undefined
        );
        test.done();
    }

});
