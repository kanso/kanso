var less = require('../less.js/lib/less'),
    async = require('kanso/deps/async'),
    logger = require('kanso/lib/logger'),
    utils = require('kanso/lib/utils'),
    spawn = require('child_process').spawn,
    path = require('path');


function compileLess(project_path, filename, settings, callback) {
    logger.info('compiling', utils.relpath(filename, project_path));
    var args = [filename];
    if (settings.less.compress) {
        args.unshift('--compress');
    }
    var lessc = spawn(__dirname + '/../less.js/bin/lessc', args);

    var css = '';
    var err_out = '';
    lessc.stdout.on('data', function (data) {
        css += data;
    });
    lessc.stderr.on('data', function (data) {
        err_out += data;
    });
    lessc.on('exit', function (code) {
        if (code === 0) {
            callback(null, css);
        }
        else {
            callback(new Error(err_out));
        }
    });
};

module.exports = function (root, path, settings, doc, callback) {
    if (!settings.less || !settings.less.compile) {
        return callback(null, doc);
    }
    var paths = settings.less.compile || [];
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    async.forEach(paths, function (p, cb) {
        var name = p.replace(/\.less$/, '.css');
        var filename = utils.abspath(p, path);
        compileLess(path, filename, settings, function (err, css) {
            if (err) {
                return cb(err);
            }
            doc._attachments[name] = {
                content_type: 'text/css',
                data: new Buffer(css).toString('base64')
            };
            cb();
        });
    },
    function (err) {
        if (settings.less.remove_from_attachments) {
            for (var k in (doc._attachments || {})) {
                if (/\.less$/.test(k)) {
                    delete doc._attachments[k];
                }
            }
        }
        callback(err, doc);
    });
};
