var tree = require('../lib/tree');


exports['build - install new - reduce dep version'] = function (test) {
    var packages = {
        'foo': {
            versions: {
                '0.0.1': { name: 'foo', version: '0.0.1', dependencies: {} },
                '0.0.2': { name: 'foo', version: '0.0.2', dependencies: {} },
                '0.0.3': { name: 'foo', version: '0.0.3', dependencies: {} }
            },
            current_version: '0.0.3',
            ranges: {},
            sources: []
        }
    };
    var bar = {
        name: 'bar',
        version: '0.0.1',
        dependencies: {
            'foo': '<= 0.0.2'
        }
    }
    var sources = [];
    tree.build(bar, sources, packages);
    test.same(packages, {
        'foo': {
            versions: {
                '0.0.1': { name: 'foo', version: '0.0.1', dependencies: {} },
                '0.0.2': { name: 'foo', version: '0.0.2', dependencies: {} },
                '0.0.3': { name: 'foo', version: '0.0.3', dependencies: {} }
            },
            current_version: '0.0.2',
            ranges: {'bar': '<= 0.0.2'},
            sources: []
        },
        'bar': {
            versions: {
                '0.0.1': {
                    name: 'bar',
                    version: '0.0.1',
                    dependencies: { 'foo': '<= 0.0.2' }
                }
            },
            current_version: '0.0.1',
            ranges: {},
            sources: []
        }
    });
    test.done();
};

exports['build - reinstall existing - increase dep version'] = function (test) {
    var packages = {
        'foo': {
            versions: {
                '0.0.1': { name: 'foo', version: '0.0.1', dependencies: {} },
                '0.0.2': { name: 'foo', version: '0.0.2', dependencies: {} },
                '0.0.3': { name: 'foo', version: '0.0.3', dependencies: {} }
            },
            current_version: '0.0.2',
            ranges: {bar: '<= 0.0.2'},
            sources: []
        },
        'bar': {
            versions: {
                '0.0.1': {
                    name: 'bar',
                    version: '0.0.1',
                    dependencies: { 'foo': '<= 0.0.2' }
                }
            },
            current_version: '0.0.1',
            ranges: {},
            sources: []
        }
    };
    var bar = {
        name: 'bar',
        version: '0.0.2',
        dependencies: {
            'foo': '> 0.0.2'
        }
    }
    var sources = [];
    tree.build(bar, sources, packages);
    test.same(packages, {
        'foo': {
            versions: {
                '0.0.1': { name: 'foo', version: '0.0.1', dependencies: {} },
                '0.0.2': { name: 'foo', version: '0.0.2', dependencies: {} },
                '0.0.3': { name: 'foo', version: '0.0.3', dependencies: {} }
            },
            current_version: '0.0.3',
            ranges: {bar: '> 0.0.2'},
            sources: []
        },
        'bar': {
            versions: {
                '0.0.1': {
                    name: 'bar',
                    version: '0.0.1',
                    dependencies: { 'foo': '<= 0.0.2' }
                },
                '0.0.2': {
                    name: 'bar',
                    version: '0.0.2',
                    dependencies: { 'foo': '> 0.0.2' }
                }
            },
            current_version: '0.0.2',
            ranges: {},
            sources: []
        }
    });
    test.done();
};

exports['build - install new - missing dep version'] = function (test) {
    test.expect(1);
    var packages = {
        'foo': {
            versions: {
                '0.0.2': { name: 'foo', version: '0.0.2', dependencies: {} },
                '0.0.3': { name: 'foo', version: '0.0.3', dependencies: {} }
            },
            current_version: '0.0.3',
            ranges: {},
            sources: []
        }
    };
    var bar = {
        name: 'bar',
        version: '0.0.1',
        dependencies: {
            'foo': '< 0.0.2'
        }
    }
    var sources = [];
    try {
        tree.build(bar, sources, packages);
    }
    catch (e) {
        test.ok(
            /No matching version for 'foo'/.test(e.message),
            "No matching version for 'foo'"
        );
    }
    test.done();
};

exports['build - install new - missing dep package'] = function (test) {
    test.expect(1);
    var packages = {
        'foo': {
            versions: {
                '0.0.3': { name: 'foo', version: '0.0.3', dependencies: {} }
            },
            current_version: '0.0.3',
            ranges: {},
            sources: []
        }
    };
    var bar = {
        name: 'bar',
        version: '0.0.1',
        dependencies: {
            'foo': null,
            'baz': null
        }
    }
    var sources = [];
    try {
        tree.build(bar, sources, packages);
    }
    catch (e) {
        test.ok(
            /No package for 'baz'/.test(e.message),
            "No package for 'baz'"
        );
    }
    test.done();
};
