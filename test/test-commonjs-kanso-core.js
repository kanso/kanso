var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};

module.exports = nodeunit.testCase({

    setUp: function (cb) {
        var that = this;
        testing.testRequire(
            'kanso/core', mcache, context, {}, function (err, kanso) {
                if (err) {
                    return cb(err);
                }
                that.kanso = kanso;
                cb();
            }
        );
    },

    'rewriteGroups': function (test) {
        var kanso = this.kanso;
        test.same(kanso.rewriteGroups('/some/path', '/some/path'), {});
        test.same(
            kanso.rewriteGroups('/path/:name', '/path/somename'),
            {name: 'somename'}
        );
        test.same(
            kanso.rewriteGroups('/:one/:two/:three', '/a/b/c'),
            {one: 'a', two: 'b', three: 'c'}
        );
        test.same(
            kanso.rewriteGroups('/path/:name', '/path/foo?test=123'),
            {name: 'foo'}
        );
        test.done();
    },

    'replaceGroups': function (test) {
        var kanso = this.kanso;
        test.equal(
            kanso.replaceGroups('/some/string', {some: 'groups'}),
            '/some/string'
        );
        test.equal(
            kanso.replaceGroups('/some/:group', {group: 'val'}),
            '/some/val'
        );
        test.equal(
            kanso.replaceGroups('/:one/:two/:three', {
                one: 'a',
                two: 'b',
                three: 'c'
            }),
            '/a/b/c'
        );
        test.equal(
            kanso.replaceGroups('/some/:group/*', {
                group: 'val'
            }, 'splat/value'),
            '/some/val/splat/value'
        );
        test.equal(
            kanso.replaceGroups('static/*', {}, 'splat/value'),
            'static/splat/value'
        );
        test.done();
    },

    'rewriteSplat': function (test) {
        var kanso = this.kanso;
        test.strictEqual(
            kanso.rewriteSplat('/some/path', '/some/path'),
            undefined
        );
        test.strictEqual(
            kanso.rewriteSplat('/some/path/*', '/some/path/'),
            ''
        );
        test.equal(
            kanso.rewriteSplat('/some/path/*', '/some/path/splat/value'),
            'splat/value'
        );
        test.done();
    }

});
