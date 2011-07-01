var plugins = require('../lib/plugins');


exports['commands'] = function (test) {
    var paths = [
        __dirname + '/fixtures/plugins/one',
        __dirname + '/fixtures/plugins/noconflict_two'
    ];
    var p = plugins.load(paths);
    test.same(Object.keys(plugins.commands(p)), ['foo', 'bar', 'baz', 'qux']);
    test.done();
};

exports['detect conflicting command names'] = function (test) {
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
};

exports['list plugins in dir'] = function (test) {
    plugins.list(__dirname + '/fixtures/plugins', function (err, plugins) {
        if (err) {
            return test.done(err);
        }
        test.same(plugins.sort(), [
            __dirname + '/fixtures/plugins/conflict_two',
            __dirname + '/fixtures/plugins/noconflict_two',
            __dirname + '/fixtures/plugins/one'
        ]);
        test.done();
    });
};
