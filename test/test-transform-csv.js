var exec = require('child_process').exec,
    path = require('path'),
    rimraf = require('rimraf'),
    fs = require('fs');


exports.tearDown = function (callback) {
    rimraf(path.resolve(__dirname,'data-output'), callback);
};

function transformTest(trans, p) {
    return function (test) {
        var datadir = path.resolve(__dirname, p);
        var datapath = path.resolve(datadir, 'data');
        var bin = path.resolve(__dirname,'../bin/kanso');
        var output = path.resolve(__dirname,'data-output');
        var cmd = bin + ' transform ' + trans + ' '  + datapath + ' ' + output;

        exec(cmd, function (err, stdout, stderr) {
            if (err) {
                return test.done(err);
            }
            var expected = fs.readFileSync(path.resolve(datadir,'expected')).toString();
            var result = fs.readFileSync(output).toString();

            test.same(result, expected);
            test.done();
        });
    };
}

exports['basic csv'] = transformTest('csv', 'testdata/basic_csv');
exports['basic tsv'] = transformTest(
    'csv --delimiter=tab',
    'testdata/basic_tsv'
);
