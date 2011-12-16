var exec = require('child_process').exec;


exports['postprocessor app'] = function (test) {
    var bin = __dirname + '/../bin/kanso';
    var app = __dirname + '/testapps/postprocessors';

    exec(bin + ' show ' + app, function (err, stdout, stderr) {
        if (err) {
            return test.done(err);
        }
        var doc = JSON.parse(stdout.toString());
        test.strictEqual(doc.postprocessor_run, true);
        test.done();
    });
};
