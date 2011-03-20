var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};

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

    'parseRequest': function (test) {
        var forms = this.forms;
        var req = {
            form: {
                'one': '1',
                'two': '2',
                'three.four.one': '3.4.1',
                'three.four.two': '3.4.2'
            }
        };
        test.same(forms.parseRequest(req), {
            'one': '1',
            'two': '2',
            'three': {
                'four': {
                    'one': '3.4.1',
                    'two': '3.4.2'
                }
            }
        });
        test.done();
    },

    'renderFields - with values': function (test) {
        test.expect(5);
        var forms = this.forms;
        var fields = this.fields;
        var f = {
            one: fields.string(),
            two: fields.string()
        };
        f.one.widget.toHTML = function (name, value) {
            test.equal(name, 'one');
            test.equal(value, '1');
            return 'one';
        };
        f.two.widget.toHTML = function (name, value) {
            test.equal(name, 'two');
            test.equal(value, '2');
            return 'two';
        };
        var values = {
            one: '1',
            two: '2'
        };
        var html = forms.renderFields(forms.render.div, f, values, {}, []);
        test.equal(
            html,
            '<div class="field required">' +
                '<label for="id_one">One</label>' +
                'one' +
            '</div>' +
            '<div class="field required">' +
                '<label for="id_two">Two</label>' +
                'two' +
            '</div>'
        );
        test.done();
    }

});
