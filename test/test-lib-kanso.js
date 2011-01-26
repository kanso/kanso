var kanso = require('../lib/kanso'),
    dust = require('../deps/dustjs/lib/dust'),
    settings = require('../lib/settings'),
    fs = require('fs');


// integration test
exports['load'] = function (test) {
    var pdir = __dirname + '/fixtures/testproject';
    settings.load(pdir, function (err, settings) {
        test.ifError(err);
        kanso.load(pdir, settings, function (err, doc) {
            if (err) {
                throw err;
            }
            test.same(doc.settings, {
                'name': 'testproject',
                'load': 'lib/app',
                'modules': ['deps','lib'],
                'templates': 'templates',
                'attachments': 'static'
            });
            test.equals(doc.testproperty, 'test property');
            test.same(Object.keys(doc.lib).sort(), ['module1','app'].sort());
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
            test.equal(
                doc.no_proxy_function,
                'function (){return "test";}'
            );
            test.same(doc.no_proxy_obj, {
                fn1: 'function (){return "one";}',
                fn2: 'function (){return "two";}'
            });
            test.same(doc._attachments, {
                'static/test.txt': {
                    'content_type': 'text/plain',
                    'data': 'dGVzdCBkYXRhCg=='
                },
                'kanso.js': {
                    'content_type': 'application/javascript',
                    'data': fs.readFileSync(
                        __dirname + '/../static/init.js'
                    ).toString('base64')
                }
            });
            test.same(doc.rewrites, [
                {from: '/kanso.js', to: 'kanso.js'},
                {from: '/_db/*', to: '../../*'},
                {from: '/_designdoc', to: './'},
                {from: '/', to: '_show/testshow'}
            ]);
            test.done();
        });
    });
};
