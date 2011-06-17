var couchdb = require('../couchdb'),
    logger = require('../logger'),
    utils = require('../utils'),
    argParse = require('../args').parse,
    url = require('url'),
    fs = require('fs');


exports.summary = 'Performs tranformations on JSON files';
exports.usage = '' +
'kanso transform TRANSFORMATION [OPTIONS] SOURCE TARGET\n' +
'\n' +
'Parameters:\n' +
'  TRANFORMATION    The operation to perform on SOURCE\n' +
'  SOURCE           The source file to use as input\n' +
'  TARGET           The filename for saving the output to\n' +
'\n' +
'Tranformations:\n' +
'  clear-ids    Clear the _id property of each document in the SOURCE file\n' +
'  add-ids      Fetch UUIDs from a CouchDB instance and use as _ids for\n' +
'               each doc in the SOURCE file.\n' +
'\n' +
'Options:\n' +
'  -u, --url    The CouchDB instance to fetch UUIDs from. Defaults to\n' +
'               http://localhost:5984';


exports.run = function (args) {
    var a = argParse(args, {
        'url': {match: ['--url','-u'], value: true}
    });
    var couchdb_url = a.options.url || 'http://localhost:5984';

    // /_uuids is at the root couchdb instance level, not the db level
    var parsed = url.parse(couchdb_url);
    delete parsed.pathname;
    delete parsed.query;
    delete parsed.search;
    var couchdb_root_url = url.format(parsed);
    var db = couchdb(couchdb_root_url);

    /*
    db.uuids(a.options.count, function (err, uuids) {
        if (err) {
            return logger.error(err);
        }
        uuids.forEach(function (uuid) {
            console.log(uuid);
        });
        logger.clean_exit = true;
    });
    */

    var trans = a.positional[0];

    if (trans === 'clear-ids') {
        var source = a.positional[1];
        var target = a.positional[2];
        if (!source) {
            logger.error('No SOURCE file');
            logger.info('Usage: ' + exports.usage);
            return;
        }
        if (!target) {
            logger.error('No TARGET file');
            logger.info('Usage: ' + exports.usage);
            return;
        }
        utils.readJSON(source, function (err, docs) {
            if (err) {
                return logger.error(err);
            }
            if (!Array.isArray(docs)) {
                docs = [docs];
            }
            docs = docs.map(function (doc) {
                delete doc._id;
                return doc;
            });
            fs.writeFile(target, JSON.stringify(docs, null, 4), function (err) {
                if (err) {
                    return logger.error(err);
                }
                else {
                    logger.end('Saved ' + target);
                }
            });
        });
    }
    else if (trans === 'add-ids') {
        var source = a.positional[1];
        var target = a.positional[2];
        if (!source) {
            logger.error('No SOURCE file');
            logger.info('Usage: ' + exports.usage);
            return;
        }
        if (!target) {
            logger.error('No TARGET file');
            logger.info('Usage: ' + exports.usage);
            return;
        }
        utils.readJSON(source, function (err, docs) {
            if (err) {
                return logger.error(err);
            }
            if (!Array.isArray(docs)) {
                docs = [docs];
            }
            logger.info(
                'Fetching ' + docs.length + ' UUIDs from ' + couchdb_root_url
            );
            db.uuids(docs.length, function (err, uuids) {
                docs = docs.map(function (doc, i) {
                    if (doc._id) {
                        logger.error(
                            'Document ' + i + ' already has _id: ' + doc._id
                        );
                        return doc;
                    }
                    doc._id = uuids[i];
                    return doc;
                });
                var output = JSON.stringify(docs, null, 4);
                fs.writeFile(target, output, function (err) {
                    if (err) {
                        return logger.error(err);
                    }
                    else {
                        logger.end('Saved ' + target);
                    }
                });
            });
        });
    }
    else {
        if (trans){
            logger.error('Unknown transformation: ' + trans);
        }
        else {
            logger.error('No transformation specified');
        }
        logger.info('Usage: ' + exports.usage);
        return;
    }
};
