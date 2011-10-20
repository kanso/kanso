var spawn = require('child_process').spawn,
    repository = require('./repository'),
    logger = require('./logger'),
    utils = require('./utils'),
    path = require('path');


exports.create = function (outfile, dir, callback) {
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
