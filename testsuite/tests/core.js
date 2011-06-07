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
    test.same(
        core.rewriteGroups('/<year>-<month>-<day>', '/2011-06-07'),
        {year: '2011', month: '06', day: '07'}
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
    test.equal(
        core.replaceGroups(
            '/<year>-<month>-<day>',
            {year: '2011', month: '06', day: '07'}
        ),
        '/2011-06-07'
    );
    test.equal(
        core.replaceGroups(
            '/<year>-<month>-<day>/:group/*',
            {year: '2011', month: '06', day: '07', group: 'val'},
            'splat/value'
        ),
        '/2011-06-07/val/splat/value'
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

exports['matchURL'] = function (test) {
    var _rewrites = kanso.app.rewrites;
    var r = kanso.app.rewrites = [
        {from: '/foo', to: '/bar', method: 'POST'},
        {from: '/foo', to: '/bar'},
        {from: '/:group/test', to: '/bar/:group'},
        {from: '/<year>-<month>-<day>', to: '/<year>:<month>:<day>'},
        {from: '/*', to: '_show/not_found'}
    ];

    test.equal(core.matchURL('POST', '/foo'), r[0]);
    test.equal(core.matchURL('GET', '/foo'), r[1]);
    test.equal(core.matchURL('GET', '/val/test'), r[2]);
    test.equal(core.matchURL('GET', '/2011-06-07'), r[3]);
    test.equal(core.matchURL('GET', '/asdf'), r[4]);

    kanso.app.rewrites = _rewrites;
    test.done();
};
