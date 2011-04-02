var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};

module.exports = nodeunit.testCase({

    setUp: function (cb) {
        var that = this;
        testing.testRequire(
            'kanso/permissions', mcache, context, {}, function (err, permissions) {
                if (err) {
                    return cb(err);
                }
                that.permissions = permissions;
                cb();
            }
        );
    },

    'matchUsername': function (test) {
        var fn = this.permissions.matchUsername();
        test.throws(function () {
            fn({}, {}, 'testuser2', null, {name:'testuser'});
        });
        test.throws(function () {
            fn({}, {}, '', null, {name:'testuser'});
        });
        // should not throw
        fn({}, {}, 'testuser', null, {name:'testuser'});
        fn({}, {}, '', null, {name: ''});
        fn({}, {}, undefined, null, {name:''});
        fn({}, {}, '', null, {name: undefined});
        test.done();
    },

    'fieldUneditable': function (test) {
        var fn = this.permissions.fieldUneditable();
        test.throws(function () {
            fn({}, {}, 'val', 'val2', {name:'testuser'});
        });
        test.throws(function () {
            fn({}, {}, '', 'val', {name:'testuser'});
        });
        // should not throw
        fn({}, {}, 'val', 'val', {name:'testuser'});
        fn({}, {}, '', '', {name: 'testuser'});
        test.done();
    },

    'usernameMatchesField': function (test) {
        var fn = this.permissions.usernameMatchesField('creator');
        var oldDoc = {creator: 'testuser'};
        var userCtx = {name: 'testuser'};
        fn({}, oldDoc, 'newVal', 'oldVal', userCtx);
        test.throws(function () {
            userCtx = {name: 'testuser2'};
            fn({}, oldDoc, 'newVal', 'oldVal', userCtx);
        });
        test.done();
    },

    'usernameMatchesField - nested field': function (test) {
        var fn = this.permissions.usernameMatchesField(['one','two','three']);
        var oldDoc = {one: {two: {three: 'testuser'}}};
        var userCtx = {name: 'testuser'};
        fn({}, oldDoc, 'newVal', 'oldVal', userCtx);
        test.throws(function () {
            userCtx = {name: 'testuser2'};
            fn({}, oldDoc, 'newVal', 'oldVal', userCtx);
        });
        test.done();
    },

    'loggedIn': function (test) {
        var fn = this.permissions.loggedIn();
        fn({}, {}, 'newVal', 'oldVal', {name: 'testuser'});
        test.throws(function () {
            fn({}, {}, 'newVal', 'oldVal', {name: ''});
        });
        test.throws(function () {
            fn({}, {}, 'newVal', 'oldVal', {});
        });
        test.throws(function () {
            fn({}, {}, 'newVal', 'oldVal', undefined);
        });
        test.done();
    },

    'all - pass': function (test) {
        var calls = [];
        var fn = this.permissions.all([
            function () { calls.push('one'); },
            function () { calls.push('two'); }
        ]);
        test.equal(fn().length, 0);
        test.same(calls, ['one', 'two']);
        test.done();
    },

    'all - fail': function (test) {
        var calls = [];
        var fn = this.permissions.all([
            function () { calls.push('one'); },
            function () { calls.push('two'); throw new Error('fail'); }
        ]);
        test.equal(fn().length, 1);
        test.same(calls, ['one', 'two']);
        test.done();
    },

    'any - pass': function (test) {
        var calls = [];
        var fn = this.permissions.any([
            function () { calls.push('one'); },
            function () { calls.push('two'); throw new Error('fail'); }
        ]);
        test.equal(fn().length, 0);
        test.same(calls, ['one']);
        test.done();
    },

    'any - fail': function (test) {
        var calls = [];
        var fn = this.permissions.any([
            function () { calls.push('one'); throw new Error('fail'); },
            function () { calls.push('two'); throw new Error('fail'); }
        ]);
        test.equal(fn().length, 2);
        test.same(calls, ['one', 'two']);
        test.done();
    },

    'inherit': function (test) {
        test.expect(4);
        var od = {test: 'olddoc'};
        var nd = {test: 'newdoc'};
        var user = {name: 'testuser'};

        var fn = this.permissions.inherit({
            authorize: function (newDoc, oldDoc, userCtx) {
                test.same(oldDoc, od);
                test.same(newDoc, nd);
                test.same(userCtx, user);
                return 'error list';
            }
        });
        test.equal(fn({}, {}, nd, od, user), 'error list');
        test.done();
    },

    'inherit - deleted doc': function (test) {
        test.expect(4);
        var od = {test: 'olddoc'};
        var nd = {test: 'newdoc'};
        var user = {name: 'testuser'};

        var fn = this.permissions.inherit({
            authorize: function (newDoc, oldDoc, userCtx) {
                test.same(oldDoc, od);
                test.same(newDoc, {_deleted: true});
                test.same(userCtx, user);
                return 'error list';
            }
        });
        test.equal(fn({}, {}, undefined, od, user), 'error list');
        test.done();
    }

});
