var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};
var mcache2 = {};
var mcache3 = {};

module.exports = nodeunit.testCase({

    setUp: function (cb) {
        var that = this;
        testing.testRequire(
            'kanso/forms', mcache, context, {}, function (err, forms) {
                if (err) {
                    return cb(err);
                }
                that.forms = forms;
                testing.testRequire(
                    'kanso/types', mcache2, context, {}, function (err, types) {
                        if (err) {
                            return cb(err);
                        }
                        that.types = types;
                        testing.testRequire(
                            'kanso/fields', mcache3, context, {}, function (err, fields) {
                                if (err) {
                                    return cb(err);
                                }
                                that.fields = fields;
                                cb();
                            }
                        );
                    }
                );
            }
        );
    },

    'formValuesToTree': function (test) {
        var forms = this.forms;
        var query = {
            'one': 'val1',
            'two.three': 'val2',
            'two.four': 'val3'
        };
        test.same(
            forms.formValuesToTree(query),
            {
                one: 'val1',
                two: {
                    three: 'val2',
                    four: 'val3'
                }
            }
        );
        test.done();
    },

    'parseRequest': function (test) {
        var forms = this.forms;
        var Type = this.types.Type;
        var Field = this.fields.Field;

        var t = new Type({
            fields: {
                one: new Field({
                    parse: function (raw) {
                        test.equal(raw, 'raw1');
                        return 'parsed1';
                    }
                }),
                two: {
                    three: new Field({
                        parse: function (raw) {
                            test.equal(raw, 'raw2');
                            return 'parsed2';
                        }
                    })
                }
            }
        });

        var doc = forms.parseRaw(t.fields, {
            one: 'raw1',
            two: {three: 'raw2'}
        });

        test.same(doc, {
            one: 'parsed1',
            two: {three: 'parsed2'}
        });

        test.done();
    }

});
