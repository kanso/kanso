var fs = require('fs');


/**
 * Loads templates, partials and helpers registered on the design doc by the
 * preprocessors and appends them to the handlebars.js module.
 */

module.exports = {
    before: 'modules/attachment',
    run: function (root, path, settings, doc, callback) {
        fs.readFile(__dirname + '/../helpers.js', function (err, content) {
            if (err) {
                return callback(err);
            }
            doc.handlebars += '\n' + content.toString();
            callback(null, doc);
        });
    }
};
