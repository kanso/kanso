var modules = require('../lib/modules'),
    fs = require('fs');

var context = {window: {}, kanso: {design_doc: {}}, console: console};

var m_dir = __dirname + '/../commonjs/kanso';
var kanso = modules.require({}, {
    'kanso': {
        'core': fs.readFileSync(m_dir + '/core.js').toString(),
        'url': fs.readFileSync(m_dir + '/url.js').toString(),
        'path': fs.readFileSync(m_dir + '/path.js').toString(),
        'querystring': fs.readFileSync(m_dir + '/querystring.js').toString()
    },
    'templates': '// templates module'
}, '/', 'kanso/core', context);


exports['getBaseURL - browser'] = function (test) {
    kanso.isBrowser = true;
    var testpath = function (p) {
        context.window.location = {pathname: p};
        return kanso.getBaseURL();
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
};

exports['getBaseURL - couchdb no vhost'] = function (test) {
    kanso.isBrowser = false;
    var testpath = function (p) {
        return kanso.getBaseURL({path: p, headers: {}});
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
};

exports['getBaseURL - couchdb with vhost'] = function (test) {
    kanso.isBrowser = false;
    var testpath = function (p) {
        var req = {
            path: ['db','_design','doc','_show','testshow'],
            headers: {'x-couchdb-vhost-path': p}
        };
        return kanso.getBaseURL(req);
    };
    test.equal(testpath('/'), '');
    test.equal(testpath('/some/path'), '');
    test.done();
};

exports['getBaseURL - couchdb no request'] = function (test) {
    kanso.isBrowser = false;
    test.throws(function () {
        kanso.getBaseURL();
    });
    test.done();
};

exports['getURL using pathname'] = function (test) {
    var testpath = function (p) {
        context.window.location = {pathname: p};
        return kanso.getURL();
    };
    test.equal(testpath('/'), '/');
    test.equal(testpath('/some/path'), '/some/path');
    test.equal(testpath('/db/_design/doc/_rewrite/'), '/');
    test.equal(testpath('/db/_design/doc/_rewrite/some/path'), '/some/path');
    test.done();
};

exports['getURL using hash'] = function (test) {
    var testpath = function (p, h) {
        context.window.location = {pathname: p, hash: h};
        return kanso.getURL();
    };
    test.equal(testpath('/', '#/'), '/');
    test.equal(testpath('/', '#/some/path'), '/some/path');
    test.equal(testpath('/db/_design/doc/_rewrite/','#/'), '/');
    test.equal(
        testpath('/db/_design/doc/_rewrite/','#/some/path'),
        '/some/path'
    );
    test.done();
};

exports['getURL hash priority over pathname'] = function (test) {
    var testpath = function (p, h) {
        context.window.location = {pathname: p, hash: h};
        return kanso.getURL();
    };
    test.equal(testpath('/other/path', '#/'), '/');
    test.equal(testpath('/other/path', '#/some/path'), '/some/path');
    test.equal(testpath('/db/_design/doc/_rewrite/other/path','#/'), '/');
    test.equal(
        testpath('/db/_design/doc/_rewrite/other/path','#/some/path'),
        '/some/path'
    );
    test.done();
};

exports['rewriteGroups'] = function (test) {
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
};

exports['replaceGroups'] = function (test) {
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
        kanso.replaceGroups('/some/:group/*', {group: 'val'}, 'splat/value'),
        '/some/val/splat/value'
    );
    test.equal(
        kanso.replaceGroups('static/*', {}, 'splat/value'),
        'static/splat/value'
    );
    test.done();
};

exports['rewriteSplat'] = function (test) {
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
};

exports['matchURL'] = function (test) {
    context.kanso.design_doc.rewrites = [
        {from: '/simple', to: 'one'},
        {from: '/with/:group', to: 'two'},
        {from: '/with/:group/and/*', to: 'three'}
    ];
    test.equal(kanso.matchURL('/nomatch'), undefined);
    test.same(kanso.matchURL('/simple'), {from: '/simple', to: 'one'});
    test.same(
        kanso.matchURL('/with/groupval'),
        {from: '/with/:group', to: 'two'}
    );
    test.same(
        kanso.matchURL('/with/groupval/and/splat/value'),
        {from: '/with/:group/and/*', to: 'three'}
    );
    test.done();
};

exports['createRequest'] = function (test) {
    test.same(
        kanso.createRequest('/path', {from: '/path', to: '_show/testshow'}),
        {path: ['_show','testshow'], client: true, headers: {}, query: {}}
    );
    test.same(
        kanso.createRequest(
            '/path/group%20val/bar',
            {from: '/path/:group/:foo', to: '_show/testshow/:foo'}
        ),
        {
            path: ['_show','testshow','bar'],
            client: true,
            headers: {},
            query: {group: 'group val', foo: 'bar'}
        }
    );
    test.same(
        kanso.createRequest(
            '/path/some/file',
            {from: '/path/*', to: 'static/*'}
        ),
        {
            path: ['static','some','file'],
            client: true,
            headers: {},
            query: {}
        }
    );
    test.same(
        kanso.createRequest(
            '/path/val?param=test&q=blah',
            {from: '/path/:group', to: '_show/testshow'}
        ),
        {
            path: ['_show','testshow'],
            client: true,
            headers: {},
            query: {group: 'val', param: 'test', q: 'blah'}
        }
    );
    test.done();
};

exports['isAppURL'] = function (test) {
    context.window.location = 'http://hostname:port/';
    test.equal(kanso.isAppURL('/'), true);
    test.equal(kanso.isAppURL('/some/path'), true);
    test.equal(kanso.isAppURL('some/path'), true);
    test.equal(kanso.isAppURL('http://hostname:port/some/path'), true);
    test.equal(kanso.isAppURL('http://hostname:port'), true);
    test.equal(kanso.isAppURL('http://otherhost:port/some/path'), false);
    test.equal(kanso.isAppURL('http://otherhost:port'), false);
    test.equal(kanso.isAppURL('http://otherhost:port'), false);
    test.done();
};
