var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    async = require('async'),
    path = require('path'),
    url = require('url'),
    util = require('util'),
    urlParse = url.parse,
    urlFormat = url.format,
    _ = require('underscore/underscore')._;


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
'  --push             Use push instead of pull replication\n' +
'  --continuous       Use continuous replication';
/*
'  --bidirectional    Replicate in both directions, from source to target\n' +
'                     and from target to source';
*/


exports.run = function (settings, args, commands) {
    var a = argParse(args, {
        'push': {match: ['--push']},
        'continuous': {match: ['--continuous']}
        //'bidirectional': {match: ['--bidirectional']}
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

    kansorc.extend(settings, '.kansorc', function (err, settings) {
        if (err) {
            return logger.error(err);
        }
        var source = utils.argToURL(settings, a.positional[0]);
        var target = utils.argToURL(settings, a.positional[1]);

        logger.info('type', 'pull');
        logger.info('source', utils.noAuthURL(source));
        logger.info('target', utils.noAuthURL(target));

        function poll(db, interval) {
            // TODO: add _active_tasks polling for progress bars ?

            var count = 0;
            var replicator = couchdb(couchdb.instanceURL(db) + '/_replicator');

            var fn = function (err, doc) {
                if (err) {
                    console.log('');
                    return logger.error(err);
                }
                if (a.options.continuous) {
                    if (count >= 2) {
                        // poll continuous replication a couple of times to
                        // see if its likely to be working
                        console.log('');
                        return logger.end();
                    }
                }
                count++;

                if (doc._replication_state === 'error') {
                    console.log('');
                    return logger.error('Replication error: ' + doc._id);
                }
                if (doc._replication_state === 'completed') {
                    console.log('');
                    logger.info('deleting document', doc._id);
                    replicator.delete(doc._id, doc._rev, function (err) {
                        if (err) {
                            return logger.error(err);
                        }
                        logger.end('Replication complete');
                    });
                    return;
                }
                if (doc._replication_state) {
                    console.log('');
                    return logger.error(
                        'Unknown replication state: ' + doc._replication_state
                    );
                }
                if (count === 1) {
                    util.print(logger.cyan('replicating '));
                }
                setTimeout(function () {
                    util.print('.');
                    replicator.get(doc._id, fn);
                }, interval);
            };

            return fn;
        }

        utils.catchAuthError(
            exports.replicate, target, [source, a.options],
            function (err, info, db) {
                if (!err && info) {
                    logger.info('Created document', info.id);
                }
                poll(db, 1000)(err, info ? {_id: info.id}: null);
            }
        );

    });
};

exports.replicate = function (target, source, options, callback) {
    var replicator = couchdb.instanceURL(target) + '/_replicator';
    if (options.push) {
        replicator = couchdb.instanceURL(source) + '/_replicator';
    }
    async.series({
        replicator: async.apply(utils.completeAuth, replicator, true),
        source: async.apply(utils.completeAuth, source, false),
        target: async.apply(utils.completeAuth, target, false)
    },
    function (err, results) {
        if (err) {
            return callback(err);
        }
        var opt = {
            continuous: options.continuous
        };
        couchdb.replicate(
            results.replicator, results.source, results.target, opt,
            function (err, info) {
                return callback(err, info, results.replicator);
            }
        );
    });
};
