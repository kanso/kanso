
var packages = require('../lib/packages');

exports['mergeDeepObjectsIgnoringConflicts'] = function (test) {
    var obj1 = {a: {x: 5}, b: {y: {z: 1}}};
    var obj2 = {a: {t: 1}, b: {y: {z: 2, l: 5}}};
    var objr = packages.merge(obj1, obj2, [], true);
    test.same(objr, {a: {x: 5, t: 1}, b: {y: {z: 2, l: 5}}});
    test.done();
};

exports['mergeWithArraysIgnoringConflicts'] = function (test) {
    var obj1 = { a : 1, b : 2, c : 3, d: { x: { f: { p: true}}}};
    var obj2 = { b : [4, 5, 6], d: { x: { f: { p: [9,8,7]}}}};
    var objr = packages.merge(obj1, obj2, [], true);
    test.same(objr, {a: 1, b: [4,5,6], c: 3, d: { x: { f: { p: [9,8,7]}}}});
    test.done();
};

