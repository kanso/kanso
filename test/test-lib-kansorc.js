var utils = require('../lib/utils'),
    kansorc = require('../lib/kansorc'),
    nodeunit = require('../deps/nodeunit'),
    path = require('path'),
    _ = require('../deps/underscore/underscore')._;


exports.kansorc = nodeunit.testCase({

    setUp: function (cb) {
        this._DEFAULTS = kansorc.DEFAULTS;
        this._readJSON = utils.readJSON;
        this._exists = path.exists;
        cb();
    },

    tearDown: function (cb) {
        kansorc.DEFAULTS = this._DEFAULTS;
        utils.readJSON = this._readJSON;
        path.exists = this._exists;
        cb();
    },

    'read paths': function (test) {
        test.expect(2);
        var rcdata = {
            test: 'test'
        };
        path.exists = function (p, cb) {
            cb(true);
        };
        var paths = [];
        utils.readJSON = function (p, cb) {
            paths.push(p);
            cb(null, rcdata);
        };
        kansorc.load(function (err, data) {
            test.same(_.defaults(rcdata, kansorc.DEFAULTS), data);
            test.same(paths, [
                '/etc/kansorc',
                '/usr/local/etc/kansorc',
                '~/.kansorc'
            ]);
            test.done();
        });
    },

    'merge data': function (test) {
        test.expect(2);
        var paths = [];
        kansorc.DEFAULTS = {defaults: true};
        path.exists = function (p, cb) {
            cb(true);
        };
        utils.readJSON = function (p, cb) {
            paths.push(p);
            var data = {};
            data['path' + paths.length] = p;
            cb(null, data);
        };
        kansorc.load(function (err, data) {
            test.same(data, {
                defaults: true,
                path1: '/etc/kansorc',
                path2: '/usr/local/etc/kansorc',
                path3: '~/.kansorc'
            });
            test.same(paths, [
                '/etc/kansorc',
                '/usr/local/etc/kansorc',
                '~/.kansorc'
            ]);
            test.done();
        });
    },

    'new properties override old ones': function (test) {
        test.expect(1);
        kansorc.DEFAULTS = {
            defaults: true,
            foo: 0,
            bar: 0,
            baz: 0
        };
        path.exists = function (p, cb) {
            cb(true);
        };
        var rcdata = {
            '/etc/kansorc': {
                one: 'one',
                foo: 1,
                baz: 1
            },
            '/usr/local/etc/kansorc': {
                two: 'two',
                foo: 2,
                bar: 1,
                baz: 2
            },
            '~/.kansorc': {
                three: 'three',
                foo: 3,
                bar: 2
            }
        };
        utils.readJSON = function (p, cb) {
            cb(null, rcdata[p]);
        };
        kansorc.load(function (err, data) {
            test.same(data, {
                defaults: true,
                one: 'one',
                two: 'two',
                three: 'three',
                foo: 3,
                bar: 2,
                baz: 2
            });
            test.done();
        });
    },

    'handle missing files': function (test) {
        kansorc.DEFAULTS = {
            defaults: true,
            foo: 'test'
        };
        path.exists = function (p, cb) {
            cb(p === '~/.kansorc');
        };
        var paths = [];
        utils.readJSON = function (p, cb) {
            paths.push(p);
            cb(null, {
                foo: 'bar'
            });
        };
        kansorc.load(function (err, data) {
            test.same(paths, ['~/.kansorc']);
            test.same(data, {
                defaults: true,
                foo: 'bar'
            });
            test.done();
        });
    },

    'use defaults when all files missing': function (test) {
        kansorc.DEFAULTS = {
            defaults: true
        };
        path.exists = function (p, cb) {
            cb(false);
        };
        var paths = [];
        utils.readJSON = function (p, cb) {
            paths.push(p);
            cb();
        };
        kansorc.load(function (err, data) {
            test.same(paths, []);
            test.same(data, kansorc.DEFAULTS);
            test.done();
        });
    }

});
