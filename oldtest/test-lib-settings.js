var settings = require('../lib/settings'),
    utils = require('../lib/utils'),
    nodeunit = require('../deps/nodeunit');


exports['load'] = nodeunit.testCase({
    setUp: function (callback) {
        this._readJSON = utils.readJSON;
        callback();
    },
    tearDown: function (callback) {
        utils.readJSON = this._readJSON;
        callback();
    },
    'readJSON': function (test) {
        utils.readJSON = function (p, cb) {
            test.equal(p, 'path/kanso.json');
            cb(null, 'result');
        };
        settings.load('path', function (err, settings) {
            test.equal(settings, 'result');
            test.done();
        });
    },
    'readJSON error': function (test) {
        utils.readJSON = function (p, cb) {
            cb('error');
        };
        settings.load('path', function (err, settings) {
            test.equal(err, 'error');
            test.done();
        });
    }
});
