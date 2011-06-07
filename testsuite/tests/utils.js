var utils = require('kanso/utils');


exports['getBaseURL - browser'] = function (test) {
    // TODO: update this so it changes isBrowser on the utils module instead
    // this is probably why this test is failing
    utils.isBrowser = true;
    var _getWindowLocation = utils.getWindowLocation;
    var testpath = function (p) {
        utils.getWindowLocation = function () {
            return {pathname: p};
        };
        return utils.getBaseURL();
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
    utils.getWindowLocation = _getWindowLocation;
    utils.isBrowser = true;
    test.done();
};

exports['getBaseURL - couchdb no vhost'] = function (test) {
    utils.isBrowser = false;
    var testpath = function (p) {
        return utils.getBaseURL({path: p, headers: {}});
    };
    test.equal(
        testpath(['db', '_design', 'doc', '_show', 'testshow']),
        '/db/_design/doc/_rewrite'
    );
    test.equal(
        testpath(['db', '_design', 'doc', '_list', 'testlist']),
        '/db/_design/doc/_rewrite'
    );
    test.equal(
        testpath(['db', '_design', 'doc']),
        '/db/_design/doc/_rewrite'
    );
    utils.isBrowser = true;
    test.done();
};

exports['getBaseURL - couchdb with vhost'] = function (test) {
    utils.isBrowser = false;
    var testpath = function (p) {
        var req = {
            path: ['db', '_design', 'doc', '_show', 'testshow'],
            headers: {'x-couchdb-vhost-path': p}
        };
        return utils.getBaseURL(req);
    };
    test.equal(testpath('/'), '');
    test.equal(testpath('/some/path'), '');
    utils.isBrowser = true;
    test.done();
};

exports['getBaseURL - couchdb no request'] = function (test) {
    utils.isBrowser = false;
    test.notEqual(utils.getBaseURL(), undefined);
    utils.isBrowser = true;
    test.done();
};

exports['getPropertyPath'] = function (test) {
    var obj = {some: {nested: {path: 'yay'}}};
    test.equal(utils.getPropertyPath(obj, ['some', 'nested', 'path']), 'yay');
    test.same(utils.getPropertyPath(obj, ['some', 'nested']), {path: 'yay'});
    test.strictEqual(
        utils.getPropertyPath(obj, ['some', 'nested', 'missing']),
        undefined
    );
    test.strictEqual(
        utils.getPropertyPath(obj, ['blah', 'blah', 'blah']),
        undefined
    );
    utils.isBrowser = true;
    test.done();
};

exports['deepCopy'] = function (test) {
    var a = {
        one: 1,
        two: {
            three: 'foo'
        },
        four: [1, 2, 3]
    };
    var b = utils.deepCopy(a);
    b.one = 2;
    b.two.three = 'bar';

    test.same(a, {
        one: 1,
        two: {
            three: 'foo'
        },
        four: [1, 2, 3]
    });
    test.same(b, {
        one: 2,
        two: {
            three: 'bar'
        },
        four: [1, 2, 3]
    });
    test.ok(a.four instanceof Array);
    test.ok(b.four instanceof Array);
    test.done();
};

exports['deepCopy - circular'] = function (test) {
    var a = {one: 1, two: {three: 'foo'}};
    a.two.four = a.two;

    var b = utils.deepCopy(a);
    b.one = 2;
    b.two.three = 'bar';

    test.same(a, {one: 1, two: {three: 'foo', four: a.two}});
    test.same(b, {one: 2, two: {three: 'bar', four: b.two}});

    test.done();
};

exports['deepCopy - constructorName'] = function (test) {
    function Test() {
        this.name = 'test';
    }

    var a = {one: new Test()};
    var b = utils.deepCopy(a);

    test.equal(utils.constructorName(a.one), 'Test');
    test.equal(utils.constructorName(b.one), 'Test');

    test.done();
};

exports['deepCopy - instanceof'] = function (test) {
    function Test(name) {
        this.name = name;
        this.hello = function () {
            return 'hello ' + this.name;
        };
    }

    var a = {one: new Test('test')};
    var b = utils.deepCopy(a);

    test.ok(a.one instanceof Test);
    test.ok(b.one instanceof Test);

    test.equal(a.one.hello(), 'hello test');
    test.equal(b.one.hello(), 'hello test');

    test.done();
};

exports['deepCopy - limit'] = function (test) {
    test.expect(1);
    var a = {a: {b: {c: {d: {e: {f: {g: 'foo'}}}}}}};
    try {
        utils.deepCopy(a, 5);
    }
    catch (e) {
        test.equal(e.message, 'deepCopy recursion limit reached');
    }
    test.done();
};

exports['deepCopy - Date'] = function (test) {
    var now = new Date();
    var a = {time: now};
    var b = utils.deepCopy(a);

    test.equal(a.time.getTime(), b.time.getTime());

    test.done();
};

exports['deepCopy - Array'] = function (test) {
    var a = {one: [1, 2, 3]};
    var b = utils.deepCopy(a);

    test.ok(a.one instanceof Array);
    test.ok(b.one instanceof Array);

    a.one.pop();
    test.same(a.one, [1, 2]);
    test.same(b.one, [1, 2, 3]);

    b.one.pop();
    test.same(a.one, [1, 2]);
    test.same(b.one, [1, 2]);

    test.done();
};

exports['override'] = function (test) {
    var a = {a: 123, b: {c: 'foo', d: 'bar'}, e: 456};
    utils.override(a, {
        a: 123,
        b: {c: 'asdf'},
        e: {hello: 'world'},
        f: 'test'
    });
    test.same(a, {
        a: 123,
        b: {c: 'asdf', d: 'bar'},
        e: {hello: 'world'},
        f: 'test'
    });
    test.done();
};
