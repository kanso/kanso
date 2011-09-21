var spawn = require('child_process').spawn,
    logger = require('./logger'),
    utils = require('./utils'),
    path = require('path');


exports.create = function (outfile, path, callback) {
    var outpath = utils.abspath(outfile, process.cwd());
    var args = ['-czvf', outpath, '--transform', 's/^\./package/', '.'];
    tar = spawn('tar', args, {cwd: path});

    var err_messages = '';

    tar.stdout.on('data', function (data) {
        data.toString().split('\n').forEach(function (p) {
            p = p.replace(/^\.\//, '');
            if (p) {
                logger.info('packing', p);
            }
        });
    });
    tar.stderr.on('data', function (data) {
        err_messages += data;
    });

    tar.on('exit', function (code) {
        if (code !== 0) {
            return callback(new Error(err_messages));
        }
        return callback();
    });
};

exports.extract = function (file, callback) {
    logger.info('extracting', path.basename(file));

    var tarfile = utils.abspath(file, process.cwd());
    tar = spawn('tar', ['-xzvf', tarfile], {cwd: path.dirname(tarfile)});

    var err_messages = '';

    tar.stdout.on('data', function (data) {
        data.toString().split('\n').forEach(function (p) {
            p = p.replace(/^\.\//, '');
            if (p) {
                logger.debug('extracting', p);
            }
        });
    });
    tar.stderr.on('data', function (data) {
        err_messages += data;
    });

    tar.on('exit', function (code) {
        if (code !== 0) {
            return callback(new Error(err_messages));
        }
        return callback();
    });
};
