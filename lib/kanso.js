var modules = require('./modules'),
    templates = require('./templates'),
    attachments = require('./attachments'),
    app = require('./app'),
    utils = require('./utils'),
    async = require('../deps/async');


exports.load = function (dir, settings, callback) {
    var doc = {settings: settings};
    async.parallel([
        async.apply(modules.load, dir, doc),
        async.apply(templates.load, dir, doc),
        async.apply(attachments.load, dir, doc)
    ],
    function (err) {
        callback(err, utils.stringifyFunctions(app.load(doc)));
    });
};
