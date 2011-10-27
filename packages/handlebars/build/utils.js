var async = require('async'),
    utils = require('kanso/utils'),
    handlebars = require('../handlebars/lib/handlebars'),
    fs = require('fs'),
    _ = require('underscore/underscore')._;


exports.registerTemplates = function (dir, doc, p, callback) {
    if (!doc._handlebars) {
        doc._handlebars = {};
    }
    if (!doc._handlebars.templates) {
        doc._handlebars.templates = {};
    }
    exports.find(p, function (err, files) {
        if (err) {
            return callback(err);
        }
        _.each(files, function (file) {
            var rel = utils.relpath(file, p);
            doc._handlebars.templates[rel] = file;
        });
        callback(null, doc);
    });
};

exports.safestr = function (str) {
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
};

exports.addTemplatePartials = function (doc, templates) {
    _.each(_.keys(templates || {}), function (k) {
        doc.handlebars += '\nHandlebars.registerPartial("' +
            exports.safestr(k) + '", ' +
            'Handlebars.templates["' + exports.safestr(k) + '"]' +
        ');\n';
    });
};

exports.addTemplates = function (doc, templates, callback) {
    async.forEach(_.keys(templates || {}), function (k, cb) {
        var file = templates[k];
        fs.readFile(file, function (err, content) {
            if (err) {
                return cb(err);
            }
            var src = content.toString();
            src = src.replace(/\.handlebars$/, '');
            doc.handlebars += '\n(function() {\n' +
                '  var template = Handlebars.template, ' +
                'templates = Handlebars.templates = Handlebars.templates || {};\n' +
                'templates["' + exports.safestr(k) +
                '"] = template(' +
                handlebars.precompile(src, {
                    knownHelpers: {},
                    knownHelpersOnly: false
                }) + ');\n' +
                '})();\n'
            cb();
        });
    }, callback);
};

exports.find = function (p, callback) {
    utils.find(p, exports.filenameFilter(p), callback);
};

exports.filenameFilter = function (p) {
    return function (f) {
        var relpath = utils.relpath(f, p);
        // should not start with a '.'
        if (/^\./.test(relpath)) {
            return false;
        }
        // should not contain a file or folder starting with a '.'
        if (/\/\./.test(relpath)) {
            return false;
        }
        return true;
    };
};
