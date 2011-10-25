var packages = require('kanso/packages'),
    async = require('async'),
    utils = require('./utils'),
    path = require('path'),
    fs = require('fs');


module.exports = function (root, dir, settings, doc, callback) {
    fs.readdir(dir, function (err, files) {
        if (err) {
            return callback(err);
        }
        // remove hidden files and .json config files
        files = files.filter(function (f) {
            // don't add configuration files
            if (f === 'kanso.json' || f === 'couchapp.json') {
                return false;
            }
            // don't add other kanso packages directly
            if (f === 'packages') {
                return false
            }
            // don't add hidden files with preceeding '.'
            return f[0] !== '.';
        });
        async.forEach(files, function (f, cb) {
            var p = path.join(dir, f);

            if (f === '_attachments') {
                utils.loadAttachments(dir + '/_attachments', p, doc, cb);
            }
            else {
                utils.loadFiles(dir, p, doc, cb);
            }
        },
        function (err) {
            callback(err, doc);
        });
    });
};
