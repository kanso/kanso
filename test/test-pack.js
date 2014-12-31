/**
 * Tests packing and unpacking packages as tar.gz files
 */

var exec = require('child_process').exec,
    fs = require('fs');

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


var TMPDIR = __dirname + '/tmp';


exports.setUp = function (callback) {
    console.log('mkdir -p ' + TMPDIR);
    exec('mkdir -p ' + TMPDIR, callback);
};

exports.tearDown = function (callback) {
    if (fs.existsSync(TMPDIR)) {
        console.log('rm -rf ' + TMPDIR);
        exec('rm -rf ' + TMPDIR, callback);
    } else {
        callback();
    }
};


function diff(test, a, b, expected) {
    console.log('diff -ur ' + a + ' ' + b);
    exec('diff -ur ' + a + ' ' + b, function (err, stderr, stdout) {
        // diff info is on stderr
        test.equal(stderr, expected);
        test.done();
    });
}


function diffTest(pkg, expected) {
    var pkgpath = __dirname + '/testapps/' + pkg;
    var outfile = TMPDIR + '/' + pkg + '.tar.gz';
    var cmd = __dirname + '/../bin/kanso pack ' + pkgpath +
        ' --outfile="' + outfile + '"';

    console.log(cmd);
    return function (test) {
        exec(cmd, function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            if (err) {
                return test.done(err);
            }
            exec('tar -xf ' + outfile, {cwd: TMPDIR}, function (err) {
                if (err) {
                    return test.done(err);
                }
                diff(test, pkgpath, TMPDIR + '/package', expected);
            });
        });
    };
}

exports.basic = diffTest('pack_basic', '');

exports.with_deps = diffTest('pack_with_deps',
    'Only in ' + __dirname + '/testapps/pack_with_deps: packages\n'
);

exports.with_bundled_deps = diffTest('pack_with_bundled_deps',
    'Only in ' + __dirname +
    '/testapps/pack_with_bundled_deps/packages: modules\n'
);
