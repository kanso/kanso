/**
 * Tests packing and unpacking packages as tar.gz files
 */

var exec = require('child_process').exec;
var path = require('path');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
/*
var child_process = require('child_process');

function exec(cmd, options, callback) {
    if (!callback) {
        callback = options;
        options = {};
    }
    console.log(cmd);
    child_process.exec(cmd, options, function (err, stdout, stderr) {
        console.log(err);
        console.log(stdout);
        console.log(stderr);
        callback.apply(this, arguments);
    });
};
*/


var TMPDIR = path.resolve(__dirname, 'tmp');


exports.setUp = function (callback) {
    rimraf(TMPDIR, function (err) {
        if (err) {
            return callback(err);
        }
        mkdirp(TMPDIR, callback);
    });
};

exports.tearDown = function (callback) {
    rimraf(TMPDIR, callback);
};


function diff(test, a, b, expected) {
    exec('diff -ur ' + a + ' ' + b, function (err, stderr, stdout) {
        // diff info is on stderr
        test.equal(stderr, expected);
        test.done();
    });
}


function diffTest(pkg, expected) {
    var pkgpath = path.resolve(__dirname,'testapps',pkg);
    var outfile = path.resolve(TMPDIR, pkg + '.tar.gz');
    var cmd = path.resolve(__dirname,'../bin/kanso') + ' pack ' + pkgpath +
        ' --outfile="' + outfile + '"';

    return function (test) {
        exec(cmd, function (err, stdout, stderr) {
            if (err) {
                console.log(cmd + '\n' + stdout + '\n' + stderr);
                return test.done(err);
            }
            exec('tar -xf ' + outfile, {cwd: TMPDIR}, function (err) {
                if (err) {
                    return test.done(err);
                }
                diff(test, pkgpath, path.resolve(TMPDIR,'package'), expected);
            });
        });
    };
}

exports.basic = diffTest('pack_basic', '');

exports.with_deps = diffTest('pack_with_deps',
    'Only in ' + path.resolve(__dirname,'testapps/pack_with_deps') + ': packages\n'
);

exports.with_bundled_deps = diffTest('pack_with_bundled_deps',
    'Only in ' + path.resolve(__dirname,'testapps/pack_with_bundled_deps/packages') + ': modules\n'
);
