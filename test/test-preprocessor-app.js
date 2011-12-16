var exec = require('child_process').exec;


exports['preprocessor app'] = function (test) {
    var bin = __dirname + '/../bin/kanso';
    var app = __dirname + '/testapps/preprocessors';

    exec(bin + ' show ' + app, function (err, stdout, stderr) {
        if (err) {
            return test.done(err);
        }
        var doc = JSON.parse(stdout.toString());
        test.same(doc.names, ['subpkg']);
        test.done();
    });
};
