var child_process = require('child_process'),
    spawn = child_process.spawn,
    repository = require('./repository'),
    settings = require('./settings'),
    logger = require('./logger'),
    utils = require('./utils'),
    tar = require('tar'),
    zlib = require("zlib"),
    path = require('path');


/**
 * Reports tar --version output
 */

var excludeList = function (dir, cfg, callback) {
    var excludes = [
        '.kansorc',
        '.git',
        '.gitignore',
        '.gitmodules',
        '.*.swp' // vim swp files
    ];
    if (!cfg.bundledDependencies) {
        // exclude packages directory by default, unless there are bundled dependencies defined
        excludes.push('packages');
        return callback(null, excludes);
    } else {
        // convert to full paths for comparison with package paths
        var bd = cfg.bundledDependencies.map(function (p) { return utils.abspath(p, dir); });

        // exclude all folders in packages that are not in the bundledDependencies list
        fs.readdir(path.resolve(dir,'packages'), function (err, files) {
            if (err) { return callback(err); }

            var packagesToExclude = files.filter(function (f) {
                var fullpath = utils.abspath(f, path.join(dir, 'packages'));
                console.log(fullpath + ' in ' + JSON.stringify(bd));
                return bd.indexOf(fullpath) === -1;
            });

            return callback(null, excludes.concat(packagesToExclude));
        });
    }
};

/**
 * Create a new tar file from the given dir storing it in the outfile.
 * Exclude files based on the kanso settings for this folder
 */
exports.create = function (outfile, dir, callback) {

    settings.load(dir, function(err, cfg) {
        if (err) {
            return callback(err);
        }

        var tmpfile = path.resolve(repository.TMP_DIR, path.basename(outfile) + '-' + new Date().getTime());
        var ignorefile = path.resolve(dir, '.kansoignore');
        var outpath = path.resolve(tmpfile);

        excludeList(dir, cfg, function (err, excludes) {

            // directory to pack
            args.push('.');

            if (path.existsSync(ignorefile)) {
                if (is_bsd) {
                    args = args.slice(0, args.length-1).concat(
                        ['-X', ignorefile, '.']
                    );
                }
                else {
                    args = args.concat(['-X', ignorefile]);
                }
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
    var err_messages = '';

    var fst = fs.createReadStream(tarfile)
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
