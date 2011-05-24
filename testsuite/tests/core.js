var core = require('kanso/core');


exports['rewriteGroups'] = function (test) {
    test.same(core.rewriteGroups('/some/path', '/some/path'), {});
    test.same(
        core.rewriteGroups('/path/:name', '/path/somename'),
        {name: 'somename'}
    );
    test.same(
        core.rewriteGroups('/:one/:two/:three', '/a/b/c'),
        {one: 'a', two: 'b', three: 'c'}
    );
    test.same(
        core.rewriteGroups('/path/:name', '/path/foo?test=123'),
        {name: 'foo'}
    );
    test.done();
};

exports['replaceGroups'] = function (test) {
    test.equal(
        core.replaceGroups('/some/string', {some: 'groups'}),
        '/some/string'
    );
    test.equal(
        core.replaceGroups('/some/:group', {group: 'val'}),
        '/some/val'
    );
    test.equal(
        core.replaceGroups('/:one/:two/:three', {
            one: 'a',
            two: 'b',
            three: 'c'
        }),
        '/a/b/c'
    );
    test.equal(
        core.replaceGroups('/some/:group/*', {
            group: 'val'
        }, 'splat/value'),
        '/some/val/splat/value'
    );
    test.equal(
        core.replaceGroups('static/*', {}, 'splat/value'),
        'static/splat/value'
    );
    test.done();
};

exports['rewriteSplat'] = function (test) {
    test.strictEqual(
        core.rewriteSplat('/some/path', '/some/path'),
        undefined
    );
    test.strictEqual(
        core.rewriteSplat('/some/path/*', '/some/path/'),
        ''
    );
    test.equal(
        core.rewriteSplat('/some/path/*', '/some/path/splat/value'),
        'splat/value'
    );
    test.done();
};
