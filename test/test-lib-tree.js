var tree = require('../lib/tree');


exports['extend - install new - reduce dep version'] = function (test) {
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
    tree.extend(bar, sources, packages, function (err, packages) {
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
        test.done(err);
    });
};


exports['extend - reinstall existing - increase dep version'] = function (test) {
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
    tree.extend(bar, sources, packages, function (err, packages) {
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
        test.done(err);
    });
};


exports['extend- install new - missing dep version'] = function (test) {
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
    tree.extend(bar, sources, packages, function (err, packages) {
        test.ok(
            /No matching version for 'foo'/.test(err.message),
            "No matching version for 'foo'"
        );
        test.done();
    });
};


exports['extend - install new - missing dep package'] = function (test) {
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
    tree.extend(bar, sources, packages, function (err, packages) {
        test.ok(
            /No package for 'baz'/.test(err.message),
            "No package for 'baz'"
        );
        test.done();
    });
};


exports['build - fetch from sources'] = function (test) {
    test.expect(2);
    var foo = {
        name: 'foo',
        version: '0.0.1',
        dependencies: {
            'bar': '>= 0.0.2'
        }
    };
    var sources = [
        function (name, callback) {
            test.equal(name, 'bar');
            process.nextTick(function () {
                callback(null, {
                    '0.0.1': {
                        name: 'bar',
                        version: '0.0.1',
                        dependencies: {}
                    },
                    '0.0.2': {
                        name: 'bar',
                        version: '0.0.2',
                        dependencies: {}
                    }
                });
            })
        }
    ];
    tree.build(foo, sources, function (err, packages) {
        test.same(packages, {
            'foo': {
                versions: {
                    '0.0.1': {
                        name: 'foo',
                        version: '0.0.1',
                        dependencies: {
                            'bar': '>= 0.0.2'
                        }
                    }
                },
                ranges: {},
                sources: [],
                current_version: '0.0.1'
            },
            'bar': {
                versions: {
                    '0.0.1': {
                        name: 'bar',
                        version: '0.0.1',
                        dependencies: {}
                    },
                    '0.0.2': {
                        name: 'bar',
                        version: '0.0.2',
                        dependencies: {}
                    }
                },
                ranges: {'foo': '>= 0.0.2'},
                sources: [],
                current_version: '0.0.2'
            }
        });
        test.done(err);
    });
};


exports['build - check multiple sources'] = function (test) {
    test.expect(4);
    var source_calls = [];
    var foo = {
        name: 'foo',
        version: '0.0.1',
        dependencies: {
            'bar': '>= 0.0.2'
        }
    };
    var sources = [
        function (name, callback) {
            test.equal(name, 'bar');
            source_calls.push('one');
            process.nextTick(function () {
                callback(null, {
                    '0.0.1': {
                        name: 'bar',
                        version: '0.0.1',
                        dependencies: {}
                    }
                });
            })
        },
        function (name, callback) {
            test.equal(name, 'bar');
            source_calls.push('two');
            process.nextTick(function () {
                callback(null, {
                    '0.0.1': {
                        name: 'bar',
                        version: '0.0.1',
                        dependencies: {}
                    },
                    '0.0.2': {
                        name: 'bar',
                        version: '0.0.2',
                        dependencies: {}
                    }
                });
            })
        }
    ];
    tree.build(foo, sources, function (err, packages) {
        test.same(source_calls, ['one', 'two']);
        test.same(packages, {
            'foo': {
                versions: {
                    '0.0.1': {
                        name: 'foo',
                        version: '0.0.1',
                        dependencies: {
                            'bar': '>= 0.0.2'
                        }
                    }
                },
                ranges: {},
                sources: [],
                current_version: '0.0.1'
            },
            'bar': {
                versions: {
                    '0.0.1': {
                        name: 'bar',
                        version: '0.0.1',
                        dependencies: {}
                    },
                    '0.0.2': {
                        name: 'bar',
                        version: '0.0.2',
                        dependencies: {}
                    }
                },
                ranges: {'foo': '>= 0.0.2'},
                sources: [],
                current_version: '0.0.2'
            }
        });
        test.done(err);
    });
};

exports['build - check only as many sources as needed'] = function (test) {
    test.expect(3);
    var source_calls = [];
    var foo = {
        name: 'foo',
        version: '0.0.1',
        dependencies: {
            'bar': '>= 0.0.2'
        }
    };
    var sources = [
        function (name, callback) {
            test.equal(name, 'bar');
            source_calls.push('one');
            process.nextTick(function () {
                callback(null, {
                    '0.0.1': {
                        name: 'bar',
                        version: '0.0.1',
                        dependencies: {}
                    },
                    '0.0.2': {
                        name: 'bar',
                        version: '0.0.2',
                        dependencies: {}
                    }
                });
            })
        },
        function (name, callback) {
            test.equal(name, 'bar');
            source_calls.push('two');
            process.nextTick(function () {
                callback(null, {
                    '0.0.2': {
                        name: 'bar',
                        version: '0.0.2',
                        dependencies: {}
                    },
                    '0.0.3': {
                        name: 'bar',
                        version: '0.0.3',
                        dependencies: {}
                    }
                });
            })
        }
    ];
    tree.build(foo, sources, function (err, packages) {
        test.same(source_calls, ['one']);
        test.same(packages, {
            'foo': {
                versions: {
                    '0.0.1': {
                        name: 'foo',
                        version: '0.0.1',
                        dependencies: {
                            'bar': '>= 0.0.2'
                        }
                    }
                },
                ranges: {},
                sources: [],
                current_version: '0.0.1'
            },
            'bar': {
                versions: {
                    '0.0.1': {
                        name: 'bar',
                        version: '0.0.1',
                        dependencies: {}
                    },
                    '0.0.2': {
                        name: 'bar',
                        version: '0.0.2',
                        dependencies: {}
                    }
                },
                ranges: {'foo': '>= 0.0.2'},
                sources: [sources[1]],
                current_version: '0.0.2'
            }
        });
        test.done(err);
    });
};
