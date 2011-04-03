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

    'parseRaw': function (test) {
        var forms = this.forms;
        var Type = this.types.Type;
        var Field = this.fields.Field;

        var t = new Type('t', {
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
            type: 't',
            one: 'raw1',
            two: {three: 'raw2'}
        });

        test.same(doc, {
            type: 't',
            one: 'parsed1',
            two: {three: 'parsed2'}
        });

        test.done();
    },

    'parseRaw - embedded': function (test) {
        var forms = this.forms;
        var Type = this.types.Type;
        var Field = this.fields.Field;

        var t1 = new Type('t1', {
            fields: {
                one: this.fields.string()
            }
        });

        var t2 = new Type('t2', {
            fields: {
                embed: new this.fields.Embedded({
                    type: t1
                })
            }
        });

        var doc = forms.parseRaw(t2.fields, {
            type: 't1',
            embed: {
                type: 't2',
                one: 'one'
            }
        });

        test.same(doc, {
            type: 't1',
            embed: {
                type: 't2',
                one: 'one'
            }
        });

        test.done();
    },

    'parseRaw - embeddedList': function (test) {
        var forms = this.forms;
        var Type = this.types.Type;
        var Field = this.fields.Field;

        var t1 = new Type('t1', {
            fields: {
                one: this.fields.string()
            }
        });

        var t2 = new Type('t2', {
            fields: {
                embed: new this.fields.EmbeddedList({
                    type: t1
                })
            }
        });

        var doc = forms.parseRaw(t2.fields, {
            type: 't1',
            embed: [{type: 't2', one: 'one'}, {type: 't2', one: 'one'}]
        });

        test.same(doc, {
            type: 't1',
            embed: [{type: 't2', one: 'one'}, {type: 't2', one: 'one'}]
        });

        test.done();
    },

    'Form.toHTML': function (test) {
        var fields = this.fields;
        var f = new this.forms.Form({
            one: fields.string(),
            two: fields.string()
        });
        var calls = [];
        var renderer = function () {
            this.start = function () {
                calls.push('start');
                return '';
            };
            this.field = function (field, name, value, raw, errors) {
                calls.push([field, name, value, raw, errors]);
            };
            this.end = function () {
                calls.push('end');
                return '';
            };
        };
        f.toHTML('req', renderer);
        test.same(calls, [
            'start',
            [f.fields.one, 'one', undefined, undefined, []],
            [f.fields.two, 'two', undefined, undefined, []],
            'end'
        ]);
        test.done();
    },

    'Form.toHTML - default values': function (test) {
        var fields = this.fields;
        var f = new this.forms.Form({
            one: fields.string({default_value: 'asdf'}),
            two: {
                three: fields.string({default_value: 'qwerty'})
            }
        });
        var calls = [];
        var renderer = function () {
            this.start = function () {
                calls.push('start');
                return '';
            };
            this.field = function (field, name, value, raw, errors) {
                calls.push([field, name, value, raw, errors]);
            };
            this.end = function () {
                calls.push('end');
                return '';
            };
        };
        f.toHTML('req', renderer);
        test.same(calls, [
            'start',
            [f.fields.one, 'one', 'asdf', 'asdf', []],
            [f.fields.two.three, 'two.three', 'qwerty', 'qwerty', []],
            'end'
        ]);
        test.done();
    },

    'Form.toHTML - existing values': function (test) {
        var fields = this.fields;
        var f = new this.forms.Form({
            one: fields.string({default_value: 'asdf'}),
            two: {
                three: fields.string()
            }
        });
        f.values = {one: 'one', two: {three: 'three'}};
        f.raw = {one: 'oneraw', two: {three: 'threeraw'}};
        var calls = [];
        var renderer = function () {
            this.start = function () {
                calls.push('start');
                return '';
            };
            this.field = function (field, name, value, raw, errors) {
                calls.push([field, name, value, raw, errors]);
            };
            this.end = function () {
                calls.push('end');
                return '';
            };
        };
        f.toHTML('req', renderer);
        test.same(calls, [
            'start',
            [f.fields.one, 'one', 'one', 'oneraw', []],
            [f.fields.two.three, 'two.three', 'three', 'threeraw', []],
            'end'
        ]);
        test.done();
    },

    'Form.toHTML - errors': function (test) {
        var fields = this.fields;
        var err1 = {field: ['one'], msg: 'err1'};
        var err2 = {field: ['two','three'], msg: 'err2'};
        var err3 = {field: ['two','three'], msg: 'err3'};

        var f = new this.forms.Form({
            one: fields.string({default_value: 'asdf'}),
            two: {
                three: fields.string()
            }
        });
        f.values = {one: 'one', two: {three: 'three'}};
        f.raw = {one: 'oneraw', two: {three: 'threeraw'}};
        f.errors = [err1, err2, err3];
        var calls = [];
        var renderer = function () {
            this.start = function () {
                calls.push('start');
                return '';
            };
            this.field = function (field, name, value, raw, errors) {
                calls.push([field, name, value, raw, errors]);
            };
            this.end = function () {
                calls.push('end');
                return '';
            };
        };
        f.toHTML('req', renderer);
        test.same(calls, [
            'start',
            [f.fields.one, 'one', 'one', 'oneraw', [err1]],
            [f.fields.two.three, 'two.three', 'three', 'threeraw', [err2, err3]],
            'end'
        ]);
        test.done();
    },

    'Form.toHTML - embedded': function (test) {
        var fields = this.fields;
        var err1 = {field: ['one'], msg: 'err1'};
        var err2 = {field: ['two','three'], msg: 'err2'};
        var err3 = {field: ['two','three'], msg: 'err3'};

        var t = new this.types.Type('t', {
            fields: {
                one: fields.string(),
                two: fields.string()
            }
        });
        var f = new this.forms.Form({
            embed: fields.embed({
                type: t
            })
        });
        var calls = [];
        var renderer = function () {
            this.start = function () {
                calls.push('start');
                return '';
            };
            this.embed = function (type, name, value, raw, errors) {
                calls.push(['embed', type, name, value, raw, errors]);
                return {
                    start: function () {
                        calls.push('start2');
                        return '';
                    },
                    field: function (field, name, value, raw, errors) {
                        calls.push(['field', field, name, value, raw, errors]);
                    },
                    end: function () {
                        calls.push('end2');
                        return '';
                    }
                }
            };
            this.end = function () {
                calls.push('end');
                return '';
            };
        };
        f.toHTML('req', renderer);
        test.same(calls, [
            'start',
            ['embed', t, 'embed', undefined, undefined, []],
            'start2',
            ['field', t.fields.one, 'embed.one', undefined, undefined, []],
            ['field', t.fields.two, 'embed.two', undefined, undefined, []],
            ['field', t.fields._id, 'embed._id', undefined, undefined, []],
            ['field', t.fields._rev, 'embed._rev', undefined, undefined, []],
            ['field', t.fields._deleted, 'embed._deleted', undefined, undefined, []],
            ['field', t.fields.type, 'embed.type', undefined, undefined, []],
            'end2',
            'end'
        ]);
        test.done();
    },

    'Form.toHTML - embeddedList': function (test) {
        var fields = this.fields;
        var err1 = {field: ['one'], msg: 'err1'};
        var err2 = {field: ['two','three'], msg: 'err2'};
        var err3 = {field: ['two','three'], msg: 'err3'};

        var t = new this.types.Type('t', {
            fields: {
                one: fields.string(),
                two: fields.string()
            }
        });
        var f = new this.forms.Form({
            embed: fields.embedList({
                type: t
            })
        });
        var calls = [];
        var renderer = function () {
            this.name = 'main';
            this.start = function () {
                calls.push('start');
                return '';
            };
            this.embedList = function (type, name, value, raw, errors) {
                calls.push(['embedList', type, name, value, raw, errors]);
                return {
                    start: function () {
                        calls.push('start2');
                        return '';
                    },
                    each: function (type, name, value, raw, errors) {
                        calls.push(['each', type, name, value, raw, errors]);
                        return {
                            start: function () {
                                calls.push('start3');
                                return '';
                            },
                            field: function (field, name, value, raw, errors) {
                                calls.push(['field', field, name, value, raw, errors]);
                            },
                            end: function () {
                                calls.push('end3');
                                return '';
                            }
                        };
                    },
                    end: function () {
                        calls.push('end2');
                        return '';
                    }
                }
            };
            this.end = function () {
                calls.push('end');
                return '';
            };
        };
        f.toHTML('req', renderer);
        test.same(calls, [
            'start',
            ['embedList', t, 'embed', undefined, undefined, []],
            'start2',
            'end2',
            'end'
        ]);
        test.done();
    },

    'Form.toHTML - embeddedList - with values': function (test) {
        var fields = this.fields;
        var err1 = {field: ['one'], msg: 'err1'};
        var err2 = {field: ['two','three'], msg: 'err2'};
        var err3 = {field: ['two','three'], msg: 'err3'};

        var t = new this.types.Type('t', {
            fields: {
                one: fields.string(),
                two: fields.string()
            }
        });
        var f = new this.forms.Form({
            embed: fields.embedList({
                type: t
            })
        });
        var calls = [];
        var renderer = function () {
            this.name = 'main';
            this.start = function () {
                calls.push('start');
                return '';
            };
            this.embedList = function (type, name, value, raw, errors) {
                calls.push(['embedList', type, name, value, raw, errors]);
                return {
                    start: function () {
                        calls.push('start2');
                        return '';
                    },
                    each: function (type, name, value, raw, errors) {
                        calls.push(['each', type, name, value, raw, errors]);
                        return {
                            start: function () {
                                calls.push('start3');
                                return '';
                            },
                            field: function (field, name, value, raw, errors) {
                                calls.push(['field', field, name, value, raw, errors]);
                            },
                            end: function () {
                                calls.push('end3');
                                return '';
                            }
                        };
                    },
                    end: function () {
                        calls.push('end2');
                        return '';
                    }
                }
            };
            this.end = function () {
                calls.push('end');
                return '';
            };
        };
        f.values = {
            embed: [{type: 't', _id: '_id', one: '1', two: '2'}]
        };
        f.raw = {
            embed: [{type: 't', _id: '_idraw', one: '1raw', two: '2raw'}]
        };
        f.toHTML('req', renderer);
        test.same(calls, [
            'start',
            ['embedList', t, 'embed', f.values.embed, f.raw.embed, []],
            'start2',
            ['each', t, 'embed.0', f.values.embed[0], f.raw.embed[0], []],
            'start3',
            ['field', t.fields.one, 'embed.0.one', '1', '1raw', []],
            ['field', t.fields.two, 'embed.0.two', '2', '2raw', []],
            ['field', t.fields._id, 'embed.0._id', '_id', '_idraw', []],
            ['field', t.fields._rev, 'embed.0._rev', undefined, undefined, []],
            ['field', t.fields._deleted, 'embed.0._deleted', undefined, undefined, []],
            ['field', t.fields.type, 'embed.0.type', 't', 't', []],
            'end3',
            'end2',
            'end'
        ]);
        test.done();
    },

    'Form.validate': function (test) {
        var fields = this.fields;
        var f = new this.forms.Form({
            one: fields.number(),
            two: fields.number()
        });
        f.validate({form: {one: '1', two: '2'}});
        test.same(f.values, {one: 1, two: 2});
        test.same(f.raw, {one: '1', two: '2'});
        test.same(f.errors, []);
        test.done();
    },

    'Form.isValid': function (test) {
        var fields = this.fields;
        var f = new this.forms.Form();
        f.errors = [];
        test.strictEqual(f.isValid(), true);
        f.errors = ['error'];
        test.strictEqual(f.isValid(), false);
        test.done();
    }

});
