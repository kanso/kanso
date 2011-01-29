var data = require('../data'),
    logger = require('../logger'),
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
    var force = false;
    for (var i = 0; i < args.length; i += 1) {
        if (args[i] === '-f' || args[i] === '--force') {
            force = true;
            args.splice(i, 1);
            i = 0;
        }
    }
    if (!args[0]) {
        logger.error('No CouchDB URL specified');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    if (!args[1]) {
        logger.error('No data file or directory specified');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    var path = args[1] || '.';
    var db = couchdb(args[0]);
    data.eachDoc(path, function (p, doc, cb) {
        logger.info('Loaded ' + p + (doc._id ? ' (' + doc._id + ')': ''));
        // TODO: add option which allows pushing docs without ids?
        if (!doc._id) {
            return logger.error('No _id defined for ' + p);
        }
        db.save(doc._id, doc, {force: force}, function (err) {
            if (!err) {
                logger.info(
                    'Saved ' + p + (doc._id ? ' (' + doc._id + ')': '')
                );
            }
            cb(err);
        });
    },
    function (err) {
        if (err) {
            return logger.error(err);
        }
        logger.end('uploads complete');
    });
};
