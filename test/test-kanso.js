var kanso = require('../lib/kanso'),
    dust = require('../deps/dustjs/lib/dust');


// integration test
exports['load'] = function (test) {
    kanso.load(__dirname + '/fixtures/testproject', function (err, doc) {
        test.ifError(err);
        test.same(doc, {
            'settings': {
                'modules': ['deps','lib'],
                'templates': 'templates',
                'attachments': 'static'
            },
            'lib': {
                'module1': 'exports.name = "module one";\n'
            },
            'deps': {
                'module2': 'exports.name = "module two";\n'
            },
            'templates': {
                'test.html': dust.compile('<h1>Test</h1>\n')
            },
            '_attachments': {
                'static/test.txt': {
                    'content-type': 'text/plain',
                    'data': 'dGVzdCBkYXRhCg=='
                }
            }
        });
        test.done();
    });
};
