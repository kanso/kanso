var modules = require('./modules'),
    templates = require('./templates'),
    settings = require('./settings'),
    attachments = require('./attachments'),
    logger = require('./logger'),
    app = require('./app'),
    utils = require('./utils'),
    async = require('../deps/async'),
    fs = require('fs'),
    path = require('path');


exports.load = function (dir, opts, callback) {
    var doc = {settings: opts};
    async.parallel([
        async.apply(modules.load, dir, doc),
        async.apply(templates.load, dir, doc),
        async.apply(attachments.load, dir, doc)
    ],
    function (err) {
        if (err) {
            return callback(err);
        }
        logger.debug('doc:', doc);
        logger.debug('Loading app');
        try {
            var newdoc = app.load(settings.addToDoc(opts, doc));
            callback(null, utils.stringifyFunctions(newdoc));
        }
        catch (e) {
            callback(e);
        }
    });
};

exports.create = function (dir, callback) {
    if (!dir) {
        return console.error('Missing target path');
    }
    dir = utils.rmTrailingSlash(dir);
    var name = path.basename(dir);
    if (!name) {
        return console.error('Missing project name');
    }
    path.exists(dir, function (exists) {
        if (exists) {
            return callback(new Error('Path already exists'));
        }
        exports.generate(dir, name, callback);
    });
};

exports.generate = function (dir, name, callback) {
    utils.cp('-r', __dirname + '/../project', dir, function (err) {
        if (err) {
            return callback(err);
        }
        async.parallel([
            async.apply(utils.ensureDir, dir + '/lib'),
            async.apply(exports.settingsTemplate, dir + '/kanso.json', name)
        ], callback);
    });
};

exports.settingsTemplate = function (file, name, callback) {
    fs.readFile(file, function (err, content) {
        if (err) {
            return callback(err);
        }
        var data = content.toString().replace('$NAME', name);
        fs.writeFile(file, data, callback);
    });
};
