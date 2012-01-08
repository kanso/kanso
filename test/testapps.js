var exec = require('child_process').exec,
    path = require('path'),
    fs = require('fs');


function appTest(p) {
    return function (test) {
        var pkgpath = path.join(__dirname, p);
        var cmd = __dirname + '/../bin/kanso show ' + pkgpath;

        exec(cmd, function (err, stdout, stderr) {
            if (err) {
                return test.done(err);
            }

            var result = JSON.parse(stdout);
            var expected = JSON.parse(
                fs.readFileSync(pkgpath + '/output.json')
            );
            delete result.kanso._build_time;
            delete expected.kanso._build_time;

            test.same(result, expected);
            test.done();
        });
    };
}

exports.postprocessors = appTest('testapps/postprocessors');
exports.preprocessors = appTest('testapps/preprocessors');
exports.intersecting_ranges = appTest('testapps/intersecting_ranges');


function appErrorTest(p, re) {
    return function (test) {
        var pkgpath = path.join(__dirname, p);
        var cmd = __dirname + '/../bin/kanso show ' + pkgpath;

        exec(cmd, function (err, stdout, stderr) {
            if (err) {
                return test.done(err);
            }

            if (!stderr) {
                return test.done(new Error(
                    'Expected building ' + p + ' to result in an error'
                ));
            }
            test.ok(re.test(stderr));
            test.done();
        });
    };
}

exports.conflicting_versions = appErrorTest(
    'testapps/conflicting_versions',
    /Conflicting packages for/
);
