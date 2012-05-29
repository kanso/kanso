var child_process = require('child_process'),
    repository = require('./repository'),
    settings = require('./settings'),
    logger = require('./logger'),
    utils = require('./utils'),
    PackageDirReader = require('./package-dir-reader'),
    tar = require('tar'),
    zlib = require("zlib"),
    path = require('path'),
    fstream = require('fstream');


/**
 * Create a new tar file from the given dir storing it in the outfile.
 * Exclude files based on the kanso settings for this folder
 */
exports.create = function (outfile, dir, callback) {

    var folder = path.resolve(dir);

    settings.load(dir, function(err, cfg) {
        if (err) {
            return callback(err);
        }

    var tmpfile = path.resolve(repository.TMP_DIR, path.basename(outfile) + '-' + new Date().getTime());

    var error = function(message) { return function() {logger.error(message);}; };

    settings.load(folder, function(err, cfg) {
        new PackageDirReader({ path: folder, bundledDependencies: cfg.bundledDependencies })
            .on("error", error("error reading "+folder))
            .pipe(tar.Pack())
            .on("error", error("tar creation error "+tmpfile))
            .pipe(zlib.Gzip())
            .on("error", error("gzip error "+tmpfile))
            .pipe(fstream.Writer({ type: "File", path: tmpfile }))
            .on("error", error("Could not write "+tmpfile))
            .on("close", function () {
                utils.mv(tmpfile, outfile, callback);
                callback();
            });
        });
    });
};

exports.extract = function (file, callback) {
    logger.info('extracting', path.basename(file));

    var tarfile = utils.abspath(file, process.cwd());
    var err_messages = '';

    var fst = fstream.Reader(tarfile)
        .pipe(zlib.Unzip())
        .on("error", function (err) {
            err_messages += err;
        })
        .pipe(tar.Extract({ path: path.dirname(tarfile) }))
        .on("entry", function (e) {
            logger.debug('extracting', e);
        })
        .on("error", function (err) {
            err_messages += err;
        })
        .on("end", function () {
            console.error("done");
            if ( err_messages ) {
                return callback(new Error(err_messages));
            } else {
                return callback();
            }
        });
};
