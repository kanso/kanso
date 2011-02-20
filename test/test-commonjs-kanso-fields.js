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
        test.expect(4);
        var fields = this.fields;
        var testdoc = {test: 'doc'};

        var f = new fields.Field({
            validators: [
                function (doc, val) {
                    test.same(doc, testdoc);
                    test.equals(val, 'value');
                },
                function (doc, val) {
                    test.same(doc, testdoc);
                    test.equals(val, 'value');
                }
            ]
        });
        f.validate(testdoc, 'value');

        test.done();
    },

    'Field.validate - exit on first error': function (test) {
        test.expect(3);
        var fields = this.fields;
        var testdoc = {test: 'doc'};
        var testerr = new Error('some error');

        var f = new fields.Field({
            validators: [
                function (doc, val) {
                    test.same(doc, testdoc);
                    test.equals(val, 'value');
                    throw testerr;
                },
                function (doc, val) {
                    test.ok(false, 'should not be called');
                }
            ]
        });
        try {
            f.validate(testdoc, 'value');
        }
        catch (e) {
            // this should be called
            test.strictEqual(e, testerr);
        }

        test.done();
    },

    'string field': function (test) {
        var f = this.fields.string();
        test.equal(f.parse('some string'), 'some string');
        test.equal(f.parse(123), '123');
        test.equal(f.parse(''), '');
        test.done();
    },

    'number field': function (test) {
        var f = this.fields.number();
        test.equal(f.parse('123'), 123);
        test.ok(isNaN(f.parse('asdf')));
        test.ok(isNaN(f.parse('')));
        test.equal(f.validators.length, 1);
        test.throws(function () {
            f.validators[0]({}, NaN, 'asdf');
        });
        test.done();
    },

    'boolean field': function (test) {
        var f = this.fields.boolean();
        test.strictEqual(f.parse('true'), true);
        test.strictEqual(f.parse(''), false);
        test.done();
    }

});
