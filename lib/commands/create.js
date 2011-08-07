var utils = require('../utils'),
    logger = require('../logger'),
    async = require('../../deps/async'),
    path = require('path'),
    fs = require('fs');


exports.summary = 'Create a new project skeleton';
exports.usage = '' +
'kanso create PATH\n' +
'\n' +
'Parameters:\n' +
'  PATH     Path to create a new project skeleton at, project name\n' +
'           defaults to last directory in this path\n';


exports.run = function (settings, args, commands) {
    if (!args.length) {
        logger.error('No target path specified');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    var dir = args[0];
    exports.create(dir, function (err) {
        if (err) {
            return logger.error(err);
        }
        logger.end(utils.abspath(dir));
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
    utils.cp('-r', __dirname + '/../../project', dir, function (err) {
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
