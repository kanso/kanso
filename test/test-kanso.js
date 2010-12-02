var kanso = require('../lib/kanso'),
    dust = require('../deps/dustjs/lib/dust'),
    fs = require('fs');


// integration test
exports['load'] = function (test) {
    var pdir = __dirname + '/fixtures/testproject';
    kanso.load(pdir, function (err, doc) {
        test.ifError(err);
        test.same(doc.settings, {
            'load': 'lib/app',
            'modules': ['deps','lib'],
            'templates': 'templates',
            'attachments': 'static'
        });
        test.equals(doc.testproperty, 'test property');
        test.same(Object.keys(doc.lib), ['module1','app']);
        test.equals(
            doc.lib.module1,
            fs.readFileSync(pdir + '/lib/module1.js').toString()
        );
        test.equals(
            doc.lib.app,
            fs.readFileSync(pdir + '/lib/app.js').toString()
        );
        test.same(doc.shows, {
            'testshow': 'function(){' +
                'return require("lib/app")["shows"]["testshow"]' +
                    '.apply(this, arguments);' +
            '}'
        });
        test.same(doc.lists, {
            'testlist': 'function(){' +
                'return require("lib/app")["lists"]["testlist"]' +
                    '.apply(this, arguments);' +
            '}'
        });
        test.same(doc.updates, {
            'testupdate': 'function(){' +
                'return require("lib/app")["updates"]["testupdate"]' +
                    '.apply(this, arguments);' +
            '}'
        });
        test.same(doc.filters, {
            'testfilter': 'function(){' +
                'return require("lib/app")["filters"]["testfilter"]' +
                    '.apply(this, arguments);' +
            '}'
        });
        test.equals(
            doc.validate_doc_update,
            'function(){' +
                'return require("lib/app")["validate_doc_update"]' +
                    '.apply(this, arguments);' +
            '}'
        );
        test.same(doc.deps, {
            'module2': 'exports.name = "module two";\n'
        });
        test.same(doc.templates, {
            'test.html': dust.compile('<h1>Test</h1>\n')
        });
        test.same(doc._attachments, {
            'static/test.txt': {
                'content-type': 'text/plain',
                'data': 'dGVzdCBkYXRhCg=='
            }
        });
        test.done();
    });
};
