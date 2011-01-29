var kanso = require('../kanso'),
    couchdb = require('../couchdb'),
    logger = require('../logger'),
    settings = require('../settings'),
    urlParse = require('url').parse,
    urlFormat = require('url').format;


exports.summary = 'Upload a project to a CouchDB instance';
exports.usage = '' +
'kanso push [OPTIONS] DB [PATH]\n' +
'\n' +
'Parameters:\n' +
'  DB     The CouchDB instance to upload the app to\n' +
'  PATH   The project path to load the app from\n' +
'\n' +
'Options:\n' +
'  --minify               Compress CommonJS modules using UglifyJS\n' +
'  --minify-attachments   Compress .js attachments';


exports.run = function (args) {
    var minify = false;
    for (var i = 0; i < args.length; i += 1) {
        if (args[i] === '--minify') {
            minify = true;
            args.splice(i, 1);
            i = 0;
        }
    }
    var minify_attachments = false;
    for (var i = 0; i < args.length; i += 1) {
        if (args[i] === '--minify-attachments') {
            minify_attachments = true;
            args.splice(i, 1);
            i = 0;
        }
    }
    if (!args[0]) {
        return logger.error('No CouchDB URL specified');
    }
    var dir = args[1] || '.';
    settings.load(dir, function (err, settings) {
        if (err) {
            return logger.error(err);
        }
        settings.minify = minify;
        settings.minify_attachments = minify_attachments;
        kanso.load(dir, settings, function (err, doc) {
            if (err) {
                return logger.error(err);
            }
            var url = args[0].replace(/\/$/, '');
            var db = couchdb(url);
            db.ensureDB(function (err) {
                if (err) {
                    return logger.error(err);
                }
                var id = '_design/' + settings.name;
                logger.info('Uploading...');
                db.save(id, doc, {force: true}, function (err) {
                    if (err) {
                        return logger.error(err);
                    }
                    else {
                        var appurl = urlParse(url);
                        delete appurl.auth;
                        delete appurl.host;
                        appurl = urlFormat(appurl);
                        logger.end(
                            appurl + '/_design/' +
                            settings.name + '/_rewrite/'
                        );
                    }
                });
            });
        });
    });
};
