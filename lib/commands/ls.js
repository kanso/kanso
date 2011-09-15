var utils = require('../utils'),
    packages = require('../packages'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    argParse = require('../args').parse;


exports.summary = 'Builds a project and reports a list of its exports';

exports.usage = '' +
'kanso ls [PATH]\n' +
'\n' +
'Parameters:\n' +
'  PATH    Path to project directory to inspect (defaults to ".")'



exports.indent = '    ';

function print_heading(str, count) {
    console.log(
        '\n' + logger.bold(str) +
        (count === undefined ? '': ' (' + count + ')')
    );
}

// prints property names without recursing
function shallow_print(title, obj) {
    if (!obj) {
        return;
    }
    var names = Object.keys(obj);
    if (!names.length) {
        return;
    }
    print_heading(title, names.length);
    names.forEach(function (name) {
        console.log(exports.indent + name);
    });
}

function deep_print(obj, ignores, path) {
    path = path || [];

    var sp = exports.indent;
    for (var i = 0; i < path.length; i++) {
        sp += exports.indent;
    }
    for (var k in obj) {
        var kp = path.concat([k]);
        if (ignores.indexOf(kp.join('.')) === -1) {
            if (typeof obj[k] === 'object') {
                if (obj[k] instanceof Array) {
                    console.log(sp + k + ' (' + k.length + ')');
                }
                else {
                    console.log(sp + k);
                    deep_print(obj[k], ignores, path.concat([k]));
                }
            }
            else {
                console.log(sp + k);
            }
        }
    }
}

exports.run = function (settings, args) {
    var a = argParse(args, {});
    var dir = utils.abspath(a.positional[0] || '.');

    // suppress logger output
    logger.level = 'error';

    exports.loadApp(dir, {}, function (err, doc, cfg) {
        if (err) {
            return logger.error(err);
        }

        shallow_print('Attachments', doc._attachments);

        print_heading('Extra properties');
        deep_print(doc, [
            // ignore these properties
            '_attachments',
            'shows',
            'lists',
            'updates',
            'filters',
            'rewrites',
            'views',
            'validate_doc_update'
        ]);

        shallow_print('Show functions', doc.shows);
        shallow_print('List functions', doc.lists);
        shallow_print('Update functions', doc.updates);
        shallow_print('Filter functions', doc.filters);

        shallow_print('Views', doc.views);

        // Rewrites
        if (doc.rewrites && doc.rewrites.length) {
            print_heading('Rewrites', doc.rewrites.length);
            doc.rewrites.forEach(function (r) {
                console.log(exports.indent + r.from);
            });
        }

        console.log(
            '\n' + logger.bold('Validate doc update: ') +
            Boolean(doc.validate_doc_update).toString()
        );

        function roundNum(num, dec) {
            return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
        }

        var str = JSON.stringify(doc);
        var bytes = Buffer.byteLength(str, 'utf8');

        var num = bytes;
        var units = 'Bytes';

        if (num > 1024) {
            num = num / 1024;
            units = 'KB'
        }
        if (num > 1024) {
            num = num / 1024;
            units = 'MB'
        }

        console.log(
            '\n' + logger.bold('Size: ') +
            roundNum(num, 2) + ' ' + units +
            ' (including dependencies)'
        );

        logger.clean_exit = true;
    });
};

exports.loadApp = function (dir, options, callback) {
    var paths = [__dirname + '/../../packages'];
    packages.load(dir, true, paths, null, options, callback);
};
