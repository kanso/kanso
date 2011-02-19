var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};

module.exports = nodeunit.testCase({

    setUp: function (cb) {
        var that = this;
        testing.testRequire(
            'kanso/types', mcache, context, {}, function (err, types) {
                if (err) {
                    return cb(err);
                }
                that.types = types;
                testing.testRequire(
                    'kanso/fields', mcache, context, {}, function (err, fields) {
                        if (err) {
                            return cb(err);
                        }
                        that.fields = fields;
                        cb();
                    }
                );
            }
        );
    },

    'validate': function (test) {
        var types = this.types;
        var fields = this.fields;

        var doc = {
            type: 'test_type',
            one: 'one',
            two: 2
        };
        var errs = types.validate({
            'test_type': {
                fields: {
                    one: fields.string(),
                    two: fields.number()
                }
            }
        }, doc);
        test.same(errs, []);
        test.done();
    },

    'validate - error': function (test) {
        var types = this.types;
        var fields = this.fields;

        var doc = {
            type: 'test_type',
            one: 'one',
            two: 'asdf'
        };
        var errs = types.validate({
            'test_type': {
                fields: {
                    one: fields.string(),
                    two: fields.number()
                }
            }
        }, doc);
        test.same(errs.length, 1);
        test.same(errs[0].message, 'Not a number');
        test.done();
    },

    'validate - nested': function (test) {
        test.expect(5);
        var types = this.types;
        var fields = this.fields;

        var testdoc = {
            type: 'test_type',
            one: 'one',
            sublevel: {
                two: 2,
                three: true
            }
        };
        var type_fields = {
            one: fields.string(),
            sublevel: {
                two: fields.number(),
                three: fields.boolean()
            }
        }
        type_fields.sublevel.three.validators.push(function (doc, value, raw) {
            test.ok(true, 'sublevel validators called');
            test.same(doc, testdoc);
            test.same(value, true);
            test.same(raw, true);
        });
        var errs = types.validate({
            'test_type': {fields: type_fields}
        }, testdoc);
        test.same(errs, []);
        test.done();
    },

    'validate - extra fields not allowed': function (test) {
        var types = this.types;
        var fields = this.fields;

        var testdoc = {
            type: 'test_type',
            sub: {
                extra: 'blah'
            }
        };
        var type_fields = {
            sub: {}
        }
        var errs = types.validate({
            'test_type': {fields: type_fields}
        }, testdoc);

        test.equals(errs.length, 1);
        test.equals(errs[0].message, 'Field "sub.extra" not defined');
        test.done();
    },

    'validate - extra fields allowed': function (test) {
        var types = this.types;
        var fields = this.fields;

        var testdoc = {
            type: 'test_type',
            sub: {
                extra: 'blah'
            }
        };
        var type_fields = {
            sub: {}
        }
        var errs = types.validate({
            'test_type': {fields: type_fields, allow_extra_fields: true}
        }, testdoc);

        test.same(errs, []);
        test.done();
    },

    'validate - array': function (test) {
        var types = this.types;
        var fields = this.fields;

        var testdoc = {
            type: 'test_type',
            one: 'one',
            list: [1,2,3,4]
        };
        var type_fields = {
            one: fields.string(),
            list: [
                fields.number()
            ]
        }
        var errs = types.validate({
            'test_type': {fields: type_fields}
        }, testdoc);

        test.same(errs, []);
        test.done();
    },

    'validate - array error': function (test) {
        var types = this.types;
        var fields = this.fields;

        var testdoc = {
            type: 'test_type',
            one: 'one',
            list: ['test', 'asdf']
        };
        var type_fields = {
            one: fields.string(),
            list: [
                fields.number()
            ]
        }
        var errs = types.validate({
            'test_type': {fields: type_fields}
        }, testdoc);

        test.equals(errs.length, 2);
        test.done();
    },

    'validate - array extra fields not allowed': function (test) {
        var types = this.types;
        var fields = this.fields;

        var testdoc = {
            type: 'test_type',
            list: [1,2,3,4]
        };
        var type_fields = {
            list: []
        }
        var errs = types.validate({
            'test_type': {fields: type_fields}
        }, testdoc);

        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'Field "list" should be empty');
        test.done();
    },

    'validate - array extra fields allowed': function (test) {
        var types = this.types;
        var fields = this.fields;

        var testdoc = {
            type: 'test_type',
            list: [1,2,3,4]
        };
        var type_fields = {
            list: []
        }
        var errs = types.validate({
            'test_type': {fields: type_fields, allow_extra_fields: true}
        }, testdoc);

        test.same(errs, []);
        test.done();
    }

    // TODO: add field (path) to Errors

    // TODO: support multiple definitions inside an array?
    // values can match any one of them?

});
