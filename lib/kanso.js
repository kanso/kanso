var modules = require('./modules'),
    templates = require('./templates'),
    settings = require('./settings'),
    attachments = require('./attachments'),
    app = require('./app'),
    async = require('../deps/async');


exports.load = function (dir, callback) {
    settings.load(dir, function (err, settings) {
        if (err) return callback(err);
        var doc = {settings: settings};
        async.parallel([
            async.apply(modules.load, dir, doc),
            async.apply(templates.load, dir, doc),
            async.apply(attachments.load, dir, doc)
        ],
        function (err) {
            callback(err, app.load(doc));
        });
    });
};
