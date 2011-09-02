var spawn = require('child_process').spawn,
    logger = require('./logger');


exports.create = function (outfile, path, callback) {
    tar = spawn('tar', ['-czvf'].concat([outfile, path]));

    var err_messages = '';

    tar.stdout.on('data', function (data) {
        data.toString().split('\n').forEach(function (p) {
            if (p && p !== path && p !== path + '/') {
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
