var templates = require('./templates'),
    modules = require('../../../lib/modules'),
    async = require('../../../deps/async'),
    fs = require('fs');


/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

module.exports = function (root, path, settings, doc, callback) {
    var p = settings.templates;
    if (!p) {
        return callback(null, doc);
    }
    if (Array.isArray(p)) {
        // TODO: remove this once merging works
        return callback(new Error(
            'Only a single templates directory may be specified'
        ));
    }

    // load the dust source code
    var dust_path = __dirname + '/../../../deps/dustjs/lib/dust.js';
    fs.readFile(dust_path, function (err, dust_src) {
        if (err) {
            return callback(err);
        }
        // load the templates
        templates.addPath(path, p, doc, function (err) {
            if (err) {
                return callback(err);
            }

            // load the templates module bootstrap code
            // TODO move this to post-processing once merging works
            //var f = __dirname + '/../../commonjs/kanso/templates.js';
            var f = __dirname + '/../kanso/templates.js';
            fs.readFile(f, function (err, src) {
                if (err) {
                    return callback(err);
                }

                // prepend the code from dust the templates
                // to commonjs/templates.js
                var templates_src = 'var dust_module = {exports: {}};\n' +
                    '(function (module, exports) {\n' +
                        dust_src + '\n' +
                        doc.kanso.templates + '\n}(' +
                        'dust_module, dust_module.exports' +
                    '));\n' +
                    'var dust = dust_module.exports;\n' +
                    src;

                modules.add(doc, 'kanso/templates', templates_src);
                callback(null, doc);
            });
        });
    });
};
