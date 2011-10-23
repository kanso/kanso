var packages = require('kanso/lib/packages'),
    couchapp = require('couchapp'),
    watch = require('../node_modules/couchapp/node_modules/watch'),
    mimetypes = require('../node_modules/couchapp/mimetypes'),
    path = require('path'),
    fs = require('fs');


module.exports = function (root, path, settings, doc, callback) {
    if (settings.app) {
        try {
            var mod = require(settings.app);
            var fake_url = 'http://localhost:5984/db';
            var app = couchapp.createApp(mod, fake_url, function (app) {
                app.prepare();
                addAttachments(app, function (err, app) {
                    if (err) {
                        return callback(err);
                    }
                    doc = packages.merge(doc, app.doc);
                    callback(null, doc);
                });
            });
        }
        catch (e) {
            return callback(e);
        }
    }
    else {
        callback(null, doc);
    }
};


function addAttachments(app, callback) {
    var pending = 0;

    // we're not using this
    delete app.doc.attachments_md5;

    // adapted from node.couchapp.js/main.js
    app.doc.__attachments.forEach(function (att) {
        watch.walk(att.root, {ignoreDotFiles:true}, function (err, files) {
            if (err) {
                return callback(err);
            }
            for (i in files) { (function (f) {
                pending += 1
                fs.readFile(f, function (err, data) {
                    f = f.replace(att.root, att.prefix || '');
                    if (f[0] == '/') f = f.slice(1)
                    if (!err) {
                        var d = data.toString('base64')
                    , mime = mimetypes.lookup(path.extname(f).slice(1))
                    ;
                app.doc._attachments[f] = {data:d, content_type:mime};
                    }
                pending -= 1
                    if (pending === 0) {
                        delete app.doc.__attachments;
                        return callback(null, app);
                    }
                })
            })(i)}
        })
    })
};
