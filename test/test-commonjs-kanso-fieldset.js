var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};
var mcache2 = {}

module.exports = nodeunit.testCase({

    setUp: function (cb) {
        var that = this;
        testing.testRequire(
            'kanso/fields', mcache, context, {}, function (err, fields) {
                if (err) {
                    return cb(err);
                }
                that.fields = fields;
                testing.testRequire(
                    'kanso/fieldset', mcache2, context, {}, function (err, fieldset) {
                        if (err) {
                            return cb(err);
                        }
                        that.fieldset = fieldset;
                        cb();
                    }
                );
            }
        );
    },

    'createDefaults': function (test) {
        var fields = this.fields;

        var userCtx = {name: 'testuser'};
        var fields = {
            one: fields.string({default_value: 'asdf'}),
            two: {
                three: fields.number({default_value: 1}),
                four: fields.string()
            },
            five: fields.boolean(),
            user: fields.string({
                default_value: function (userCtx) {
                    return userCtx.name;
                }
            })
        };
        test.same(
            this.fieldset.createDefaults(fields, userCtx),
            {one: 'asdf', two: {three: 1}, user: 'testuser'}
        );
        test.done();
    }

});
