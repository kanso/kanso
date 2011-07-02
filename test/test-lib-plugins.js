var plugins = require('../lib/plugins'),
    nodeunit = require('../deps/nodeunit');


exports.plugins = nodeunit.testCase({

    setUp: function (cb) {
        this._BUILTIN = plugins.BUILTIN;
        plugins.BUILTIN = [];
        cb();
    },

    tearDown: function (cb) {
        plugins.BUILTIN = this._BUILTIN;
        cb();
    },

    'commands': function (test) {
        var paths = [
            __dirname + '/fixtures/plugins/one',
            __dirname + '/fixtures/plugins/noconflict_two'
        ];
        var p = plugins.load(paths);
        test.same(Object.keys(plugins.commands(p)), ['foo', 'bar', 'baz', 'qux']);
        test.done();
    },

    'detect conflicting command names': function (test) {
        test.expect(1);
        var paths = [
            __dirname + '/fixtures/plugins/one',
            __dirname + '/fixtures/plugins/conflict_two'
        ];
        try {
            var p = plugins.load(paths);
        }
        catch (e) {
            test.equal(
                e.message,
                'Command "bar" in "' + paths[0] + '" conflicts with "' +
                paths[1] + '"'
            );
        }
        test.done();
    }

});
