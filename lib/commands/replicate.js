var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    ProgressBar = require('progress'),
    async = require('async'),
    util = require('util'),
    _ = require('underscore')._;


exports.summary = 'Exchange data between databases';

exports.usage = '' +
'kanso replicate SOURCE TARGET\n' +
'\n' +
'Databases can be specified using a full URL, just a name for a database\n' +
'on localhost:5984, or by an environment (in your .kansorc).\n' +
'\n' +
'Parameters:\n' +
'  SOURCE    The database to replicate from\n' +
'  TARGET    The database to replicate to\n' +
'\n' +
'Options:\n' +
'  --push       Use push instead of pull replication\n' +
'  --create     Create target database if it doesn\'t exist\n' +
'  --progress   Display progress bar';


exports.run = function (settings, args, commands) {
    var a = argParse(args, {
        'push': {match: ['--push']},
        'create_target': {match: ['--create']},
        'progress': {match: ['--progress']}
    });

    if (a.positional.length < 1) {
        logger.error('Missing SOURCE database');
        console.log(exports.usage);
        return;
    }
    if (a.positional.length < 2) {
        logger.error('Missing TARGET database');
        console.log(exports.usage);
        return;
    }

    exports.init(settings, a, function (err, source, target, settings) {
        if (err) {
            return logger.error(err);
        }
        logger.info('source', utils.noAuthURL(source));
        logger.info('target', utils.noAuthURL(target));

        // push or pull replication?
        var replicator = couchdb.instanceURL(
            a.options.push ? source: target
        );

        utils.catchAuthError(
            exports.replicate, replicator, [source, target, a.options],
            function (err, resp) {
                if (err) {
                    return logger.error(err);
                }
                logger.end();
            }
        );

    });
};


exports.init = function (settings, a, callback) {
    kansorc.extend(settings, '.kansorc', function (err, settings) {
        if (err) {
            return callback(err);
        }
        var source = utils.argToEnv(settings, a.positional[0]).db;
        var target = utils.argToEnv(settings, a.positional[1]).db;

        utils.completeAuth(source, false, function (err, source) {
            if (err) {
                return callback(err);
            }
            utils.completeAuth(source, false, function (err, source) {
                if (err) {
                    return callback(err);
                }
                callback(null, source, target, settings);
            });
        });
    });
};


exports.replicate = function (replicator, source, target, options, callback) {
    utils.completeAuth(replicator, false, function (err, replicator) {
        if (err) {
            return logger.error(err);
        }
        var data = {
            source: source,
            target: target,
            create_target: options.create_target || false
        };
        var db = couchdb(replicator);
        if (options.progress) {
            var bar = new ProgressBar('Replicating [:bar] :percent', {
                total: 100,
                width: 30
            });
            // report progress
            var t = setInterval(function () {
                db.client('GET', '/_active_tasks', {}, function (err, data, res) {
                    if (!err) {
                        var task = _.detect(data, function (t) {
                            return (
                                t.source === source.replace(/\/$/, '') + '/'  &&
                                t.target === target.replace(/\/$/, '') + '/'
                            );
                        });
                        if (task) {
                            bar.tick(task.progress - bar.curr);
                            if (bar.complete) {
                                clearInterval(t);
                            }
                        }
                    }
                });
            }, 3000);
        }
        else {
            console.log('Replicating...');
        }
        // start replication
        db.client('POST', '/_replicate', data, function (err, data, res) {
            if (options.progress) {
                bar.tick(100);
                clearInterval(t);
            }
            return callback.apply(this, arguments);
        });
    });
};
