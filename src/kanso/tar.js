var child_process = require('child_process'),
    spawn = child_process.spawn,
    repository = require('./repository'),
    logger = require('./logger'),
    utils = require('./utils'),
    path = require('path');


/**
 * Reports tar --version output
 */

exports.version = function (callback) {
    child_process.exec('tar --version', function (err, stdout, stderr) {
        if (err) {
            return callback(err);
        }
        if (stderr) {
            return callback(new Error('Error getting tar version\n' + stderr));
        }
        callback(null, stdout.toString());
    });
};

/**
 * Checks if using BSD tar
 */

exports.isBSD = function (callback) {
    exports.version(function (err, output) {
        if (err) {
            return callback(err);
        }
        callback(null, output.indexOf('bsdtar') !== -1);
    });
};

exports.create = function (outfile, dir, callback) {
    exports.isBSD(function (err, is_bsd) {
        if (err) {
            return callback(err);
        }
        var tmpfile = repository.TMP_DIR +
            path.basename(outfile) + '-' + new Date().getTime();

        var ignorefile = path.join(dir, '.kansoignore');
        path.exists(ignorefile, function (ignores) {
            var outpath = utils.abspath(tmpfile, process.cwd());
            var args = [
                '-czvf', outpath,
                '--transform', 's/^\./package/',
                '--exclude', '.kansorc',
                '--exclude', '.git',
                '--exclude', '.gitignore',
                '--exclude', '.gitmodules',
                '.'
            ];
            if (is_bsd) {
                // change --transform command to -s
                args[2] = '-s';
                args[3] = '#^\./#package/#';
            }
            if (ignores) {
                args = args.concat(['-X', ignorefile]);
            }
            tar = spawn('tar', args, {cwd: dir});

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
                utils.mv(tmpfile, outfile, callback);
            });
        });
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
