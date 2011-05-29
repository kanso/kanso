var events = require('kanso/events'),
    app = require('lib/app');


exports['manually bind to events and trigger'] = function (test) {
    test.expect(4);
    events.removeAllListeners('test_event');
    var fn = function (arg1, arg2) {
        test.equal(arg1, 'one');
        test.equal(arg2, 'two');
    };
    events.on('test_event', fn);
    test.same(events.listeners('test_event'), [fn]);
    events.emit('test_event', 'one', 'two');
    events.removeAllListeners('test_event');
    test.same(events.listeners('test_event'), []);
    test.done();
};

exports['multiple listeners for an event'] = function (test) {
    test.expect(7);
    events.removeAllListeners('test_event');
    var call_order = [];
    var fn1 = function (arg1, arg2) {
        test.equal(arg1, 'one');
        test.equal(arg2, 'two');
        call_order.push('fn1');
    };
    var fn2 = function (arg1, arg2) {
        test.equal(arg1, 'one');
        test.equal(arg2, 'two');
        call_order.push('fn2');
    };
    events.on('test_event', fn1);
    events.on('test_event', fn2);
    test.same(events.listeners('test_event'), [fn1, fn2]);
    events.emit('test_event', 'one', 'two');
    events.removeAllListeners('test_event');
    test.same(events.listeners('test_event'), []);
    test.same(call_order, ['fn1', 'fn2']);
    test.done();
};

exports['prevent event propagation'] = function (test) {
    test.expect(5);
    events.removeAllListeners('test_event');
    var call_order = [];
    var fn1 = function (arg1, arg2) {
        test.equal(arg1, 'one');
        test.equal(arg2, 'two');
        call_order.push('fn1');
        return false;
    };
    var fn2 = function (arg1, arg2) {
        call_order.push('fn2');
    };
    events.on('test_event', fn1);
    events.on('test_event', fn2);
    test.same(events.listeners('test_event'), [fn1, fn2]);
    events.emit('test_event', 'one', 'two');
    events.removeAllListeners('test_event');
    test.same(events.listeners('test_event'), []);
    test.same(call_order, ['fn1']);
    test.done();
};

exports['once'] = function (test) {
    test.expect(3);
    events.removeAllListeners('test_event');
    var fn = function (arg1, arg2) {
        test.equal(arg1, 'one');
        test.equal(arg2, 'two');
    };
    events.once('test_event', fn);
    events.emit('test_event', 'one', 'two');
    events.emit('test_event', 'one', 'two');
    events.emit('test_event', 'one', 'two');
    events.removeAllListeners('test_event');
    test.same(events.listeners('test_event'), []);
    test.done();
};

exports['removeListener'] = function (test) {
    test.expect(5);
    events.removeAllListeners('test_event');

    // test normal listeners
    var fn1 = function () {
        return 'one';
    };
    var fn2 = function () {
        return 'two';
    };
    events.on('test_event', fn1);
    events.on('test_event', fn2);
    test.same(events.listeners('test_event'), [fn1, fn2]);
    events.removeListener('test_event', fn1);
    test.same(events.listeners('test_event'), [fn2]);
    events.removeListener('test_event', fn2);
    test.same(events.listeners('test_event'), []);

    // test listeners added using once function
    var fn3 = function () {
        return 'three';
    };
    events.once('test_event', fn3);
    test.equal(events.listeners('test_event').length, 1);
    events.removeListener('test_event', fn3);
    test.same(events.listeners('test_event'), []);

    test.done();
};

exports['complex example of event bindings'] = function (test) {
    events.removeAllListeners('test_event');

    var calls = [];
    var testfn = function (name, result) {
        return function () {
            calls.push(name);
            return result;
        };
    };
    var fn1 = testfn(1);
    var fn2 = testfn(2, false);
    var fn3 = testfn(3, false);
    var fn4 = testfn(4);

    events.on('test_event', fn1);
    events.once('test_event', fn2); // returns false
    events.on('test_event', fn3); // return false
    events.once('test_event', fn4);

    events.emit('test_event');
    test.same(calls, [1, 2]);

    events.emit('test_event');
    test.same(calls, [1, 2, 1, 3]);

    events.emit('test_event');
    test.same(calls, [1, 2, 1, 3, 1, 3]);

    events.removeListener('test_event', fn3);
    events.emit('test_event');
    test.same(calls, [1, 2, 1, 3, 1, 3, 1, 4]);

    events.emit('test_event');
    test.same(calls, [1, 2, 1, 3, 1, 3, 1, 4, 1]);

    events.emit('test_event');
    test.same(calls, [1, 2, 1, 3, 1, 3, 1, 4, 1, 1]);

    test.done();
};

exports['trigger events exported from app'] = function (test) {
    test.expect(2);
    events.removeAllListeners('test_event');
    app.events = app.events || {};
    app.events['test_event'] = function (msg) {
        test.same(msg, 'hello', 'test event listener fired');
    };
    events.emit('test_event', 'hello');
    events.emit('test_event', 'hello');
    delete app.events['test_event'];
    events.emit('test_event', 'hello');
    test.done();
};

exports['trigger manually bound events before app events'] = function (test) {
    test.expect(1);
    events.removeAllListeners('test_event');
    app.events = app.events || {};
    var calls = [];
    var fn = function () {
        calls.push(1);
    };
    app.events['test_event'] = function () {
        calls.push(2);
    };
    events.on('test_event', fn);
    events.emit('test_event');
    test.same(calls, [1, 2]);
    delete app.events['test_event'];
    events.removeAllListeners('test_event');
    test.done();
};

exports['listeners list includes exported from app'] = function (test) {
    test.expect(2);
    events.removeAllListeners('test_event');

    app.events = app.events || {};
    var appfn = app.events['test_event'] = function (msg) {
        return 'appfn';
    };
    var fn = function () {
        return 'fn';
    };
    test.same(events.listeners('test_event'), [appfn]);
    events.on('test_event', fn);
    test.same(events.listeners('test_event'), [fn, appfn]);

    events.removeAllListeners('test_event');
    test.done();
};
