var logger = require('../logger'),
    argParse = require('../args').parse,
    settings = require('../settings'),
    push = require('./push');


exports.summary = 'Upload the kanso admin app to a CouchDB instance';
exports.usage = '' +
'kanso pushadmin [OPTIONS] DB\n' +
'\n' +
'Parameters:\n' +
'  DB     The CouchDB instance to upload the app to\n' +
'\n' +
'Options:\n' +
'  --minify               Compress CommonJS modules using UglifyJS\n' +
'  --minify-attachments   Compress .js attachments\n' +
'  --baseURL PATH         Force the baseURL to a specific value.\n' +
'                         (allows vhosts on CouchDB < v1.1.x)';

exports.run = function (args) {
    var a = argParse(args, {
        'minify': {match: '--minify'},
        'minify_attachments': {match: '--minify-attachments'},
        'baseURL': {match: '--baseURL', value: true}
    });
    if (!a.positional[0]) {
        return logger.error('No CouchDB URL specified');
    }
    var dir = __dirname + '/../../admin';
    settings.load(dir, function (err, settings) {
        if (err) {
            return logger.error(err);
        }
        settings.minify = a.options.minify;
        settings.minify_attachments = a.options.minify_attachments;
        if (a.options.baseURL !== undefined) {
            settings.baseURL = a.options.baseURL || '';
        }
        var url = a.positional[0].replace(/\/$/, '');
        url = url.search(/^http/) != -1 ? url : 'http://localhost:5984/' + url;
        push.loadApp(dir, settings, url);
    });
};
