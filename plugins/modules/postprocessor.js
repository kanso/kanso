var fs = require('fs'),
    mime = require('../../deps/node-mime/mime'),
    modules = require('../../lib/modules'),
    logger = require('../../lib/logger'),
    utils = require('../../lib/utils');


/**
 * Create kanso.js attachment using _modules property to find modules in the
 * design doc and wrap them with the appropriate boilerplate.
 */

module.exports = function (path, settings, doc, callback) {
    if (!doc._modules) {
        // TODO: should this throw?
        return callback(null, doc);
    }

    var wrapped_modules = '';
    for (var k in doc._modules) {
        wrapped_modules += modules.wrap(k, utils.getPropertyPath(doc, k));
    }

    delete doc._modules;

    fs.readFile(__dirname + '/kanso.js', function (err, content) {
        if (err) {
            return callback(err);
        }
        var data = content.toString();
        data += wrapped_modules || '';
        data += '\nkanso.init();';

        if (settings.minify) {
            logger.info('compressing', 'kanso.js');
            data = minify(data);
        }

        if (!doc._attachments) {
            doc._attachments = {};
        }
        doc._attachments['kanso.js'] = {
            'content_type': mime.lookup('kanso.js'),
            'data': new Buffer(data).toString('base64')
        };

        doc.format = 'kanso';
        callback(null, doc);
    });
};
