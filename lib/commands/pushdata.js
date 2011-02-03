var data = require('../data'),
    logger = require('../logger'),
    argParse = require('../args').parse,
    couchdb = require('../couchdb');


exports.summary = 'Push a file or directory of json files to DB';
exports.usage = '' +
'kanso pushdata [OPTIONS] DB PATH\n' +
'\n' +
'Parameters:\n' +
'  DB     The CouchDB instance to upload the documents to\n' +
'  PATH   A file or directory containing JSON documents to upload\n' +
'\n'+
'Options:\n' +
'  -f, --force      Ignore document conflict errors and upload anyway';


exports.run = function (args) {
    var a = argParse(args, {
        'force': {match: ['--force','-f']}
    });
    if (!a.positional[0]) {
        logger.error('No CouchDB URL specified');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    if (!a.positional[1]) {
        logger.error('No data file or directory specified');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    var path = a.positional[1] || '.';
    var db = couchdb(a.positional[0]);
    data.eachDoc(path, function (p, doc, cb) {
        logger.info('Loaded ' + p + (doc._id ? ' (' + doc._id + ')': ''));
        // TODO: add option which allows pushing docs without ids?
        if (!doc._id) {
            return logger.error('No _id defined for ' + p);
        }
        db.save(doc._id, doc, {force: a.options.force}, function (err) {
            if (!err) {
                logger.info(
                    'Saved ' + p + (doc._id ? ' (' + doc._id + ')': '')
                );
            }
            else {
                logger.error('Error saving ' + p +
                    (doc._id ? ' (' + doc._id + ')': '')
                );
                logger.error(err);
            }
            cb(err);
        });
    },
    function (err) {
        if (err) {
            // errors now reported per-file
            //return logger.error(err);
            return;
        }
        logger.end('uploads complete');
    });
};
