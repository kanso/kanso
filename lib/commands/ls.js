var utils = require('../utils'),
    packages = require('../packages'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    path = require('path'),
    tree = require('../tree'),
    install = require('./install');


exports.summary = 'Builds a project and reports a list of its exports';

exports.usage = '' +
'kanso ls [PATH]\n' +
'\n' +
'Parameters:\n' +
'  PATH    Path to project directory to inspect (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --name              Show package name\n' +
'  --version           Show package version\n' +
'  --description       Show package description\n' +
'  --preprocessors     List preprocessors\n' +
'  --postprocessors    List postprocessors\n' +
'  --attachments       List attachment filenames\n' +
'  --properties        List other properties added the design doc\n' +
'  --shows             List show functions\n' +
'  --lists             List list function\n' +
'  --updates           List update functions\n' +
'  --filters           List filter functions\n' +
'  --views             List views\n' +
'  --rewrites          List rewrites (by "from" pattern)\n' +
'  --validate          Test whether validate_doc_update exists\n' +
'  --size              Calculate size of design doc including dependencies\n' +
'  --dependencies      List dependencies\n' +
'\n' +
'If no options are specified, shows all information';



exports.indent = '    ';

function print_heading(str, count) {
    console.log(
        logger.bold(str) +
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
    console.log('');
}

function deep_print(obj, ignores, path) {
    path = path || [];
    var str = '';

    var sp = exports.indent;
    for (var i = 0; i < path.length; i++) {
        sp += exports.indent;
    }
    for (var k in obj) {
        var kp = path.concat([k]);
        if (ignores.indexOf(kp.join('.')) === -1) {
            if (typeof obj[k] === 'object') {
                if (obj[k] instanceof Array) {
                    str += sp + k + ' (' + k.length + ')\n';
                }
                else {
                    str += sp + k + '\n';
                    str += deep_print(obj[k], ignores, path.concat([k]));
                }
            }
            else {
                str += sp + k + '\n';
            }
        }
    }
    return str;
}

/**
 * Prints a hierarchy. Parameter 2 and 3 should not be passed by user code.
 * @param obj an object with a structure like: {title: 'root', children: [{title: 'ch1', children: []}, {title: 'ch2', children: []}]}
 */
function hierarchy_print(obj, thislevellog, nextlevellog) {
    var joinedprint = function () {
        console.log(Array.prototype.slice.call(arguments).join(''));
    };
    thislevellog = thislevellog || joinedprint;
    nextlevellog = nextlevellog || joinedprint;

    if (typeof obj.title !== 'undefined') {
        if (obj.children.length > 0) {
            thislevellog(logger.yellow('┬─ ') + obj.title);
        } else {
            thislevellog(logger.yellow('── ') + obj.title);
        }
    }
    for (var i = 0; i < obj.children.length - 1; i++) {
        hierarchy_print(obj.children[i], nextlevellog.bind(null, logger.yellow('├─')), nextlevellog.bind(null, logger.yellow('│ ')));
    }
    if (obj.children.length > 0) {
        hierarchy_print(obj.children[obj.children.length - 1], nextlevellog.bind(null, logger.yellow('└─')), nextlevellog.bind(null, '  '));
    }
};

exports.run = function (settings, args) {
    var options = {
        name:           {match: '--name'},
        version:        {match: '--version'},
        description:    {match: '--description'},
        preprocessors:  {match: '--preprocessors'},
        postprocessors: {match: '--postprocessors'},
        attachments:    {match: '--attachments'},
        properties:     {match: '--properties'},
        shows:          {match: '--shows'},
        lists:          {match: '--lists'},
        updates:        {match: '--updates'},
        filters:        {match: '--filters'},
        views:          {match: '--views'},
        rewrites:       {match: '--rewrites'},
        validate:       {match: '--validate'},
        size:           {match: '--size'},
        dependencies:   {match: '--dependencies'},
    };
    var a = argParse(args, options);
    var dir = utils.abspath(a.positional[0] || '.');
    kansorc.extend(settings, dir + '/.kansorc', function (err, settings) {
        if (err) {
            return logger.error(err);
        }
        var custom = false;

        for (var k in options) {
            custom = custom || a.options[k];
        }

        // suppress logger output
        logger.level = 'error';

        exports.loadApp(dir, {}, settings, function (err, doc, cfg) {
            if (err) {
                return logger.error(err);
            }

            if (!custom || a.options.name) {
                console.log(logger.bold('Name: ') + cfg.name + '\n');
            }
            if (!custom || a.options.version) {
                console.log(logger.bold('Version: ') + cfg.version + '\n');
            }
            if (!custom || a.options.description) {
                console.log(
                    logger.bold('Description') + '\n' +
                    cfg.description + '\n'
                );
            }

            if (!custom || a.options.preprocessors) {
                shallow_print('Preprocessors', cfg.preprocessors);
            }
            if (!custom || a.options.postprocessors) {
                shallow_print('Postprocessors', cfg.postprocessors);
            }

            if (!custom || a.options.attachments) {
                shallow_print('Attachments', doc._attachments);
            }
            if (!custom || a.options.properties) {
                var str = deep_print(doc, [
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
                if (str) {
                    print_heading('Extra properties');
                    console.log(str);
                }
            }

            if (!custom || a.options.shows) {
                shallow_print('Show functions', doc.shows);
            }
            if (!custom || a.options.lists) {
                shallow_print('List functions', doc.lists);
            }
            if (!custom || a.options.updates) {
                shallow_print('Update functions', doc.updates);
            }
            if (!custom || a.options.filters) {
                shallow_print('Filter functions', doc.filters);
            }

            if (!custom || a.options.views) {
                shallow_print('Views', doc.views);
            }

            if (!custom || a.options.rewrites) {
                // Rewrites
                if (doc.rewrites && doc.rewrites.length) {
                    print_heading('Rewrites', doc.rewrites.length);
                    doc.rewrites.forEach(function (r) {
                        console.log(exports.indent + r.from);
                    });
                    console.log('');
                }
            }

            if (!custom || a.options.validate) {
                if (doc.validate_doc_update || custom) {
                    console.log(
                        logger.bold('Validate doc update: ') +
                        Boolean(doc.validate_doc_update).toString() +
                        '\n'
                    );
                }
            }

            if (!custom || a.options.size) {
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
                    logger.bold('Size: ') +
                    roundNum(num, 2) + ' ' + units +
                    ' (including dependencies)\n'
                );
            }

            if (!custom || a.options.dependencies) {
                console.log(logger.bold('Dependencies'));

                tree.build({config: cfg, source: 'root'}, [install.dirSource(path.join(dir, 'packages'))], function (err, packages) {
                    var mypkgs = [];
                    var attach_deps = function (key, obj, ptree) {
                        for (var k in ptree) {
                            if (ptree.hasOwnProperty(k) && ptree[k].ranges && ptree[k].ranges.hasOwnProperty(key)) {
                                obj.push({
                                    "title"   : logger.cyan(k) + (ptree[k].ranges[key] ? logger.cyan('(' + ptree[k].ranges[key] + ')') : '') + '@' + ptree[k].current_version, 
                                    "children": []
                                });
                                attach_deps(k, obj[obj.length -1 ].children, ptree);
                            }
                        }
                    };
                    attach_deps(cfg.name, mypkgs, packages);

                    hierarchy_print({children: mypkgs});

                    console.log('');
                    logger.end();
                });
            } else {
                logger.end();
            }
        });
    });
};

exports.loadApp = function (dir, options, settings, callback) {
    var paths = settings.package_paths || [];
    var parent_dir = path.dirname(dir);
    if (path.basename(parent_dir) === 'packages') {
        paths.push(parent_dir);
    }
    packages.load(dir, paths, null, options, callback);
};
