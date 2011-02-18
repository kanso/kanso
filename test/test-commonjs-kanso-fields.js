var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};

module.exports = nodeunit.testCase({

    setUp: function (cb) {
        var that = this;
        testing.testRequire(
            'kanso/fields', mcache, context, {}, function (err, fields) {
                if (err) {
                    return cb(err);
                }
                that.fields = fields;
                cb();
            }
        );
    },

    'create new field with defaults': function (test) {
        var fields = this.fields;
        var f = new fields.Field();
        test.ok(f instanceof fields.Field);
        test.equal(f.required, true);
        test.equal(f.parse('val'), 'val');
        test.ok(Array.isArray(f.validators));
        test.equal(f.validators.length, 0);
        test.done();
    },

    'Field.validate - call all validators': function (test) {
        test.expect(6);
        var fields = this.fields;
        var testdoc = {test: 'doc'};

        var f = new fields.Field({
            validators: [
                function (doc, val, raw) {
                    test.same(doc, testdoc);
                    test.equals(val, 'value');
                    test.equals(raw, 'raw');
                },
                function (doc, val, raw) {
                    test.same(doc, testdoc);
                    test.equals(val, 'value');
                    test.equals(raw, 'raw');
                }
            ]
        });
        f.validate(testdoc, 'value', 'raw');

        test.done();
    },

    'Field.validate - exit on first error': function (test) {
        test.expect(4);
        var fields = this.fields;
        var testdoc = {test: 'doc'};
        var testerr = new Error('some error');

        var f = new fields.Field({
            validators: [
                function (doc, val, raw) {
                    test.same(doc, testdoc);
                    test.equals(val, 'value');
                    test.equals(raw, 'raw');
                    throw testerr;
                },
                function (doc, val, raw) {
                    test.ok(false, 'should not be called');
                }
            ]
        });
        try {
            f.validate(testdoc, 'value', 'raw');
        }
        catch (e) {
            // this should be called
            test.strictEqual(e, testerr);
        }

        test.done();
    }

});
