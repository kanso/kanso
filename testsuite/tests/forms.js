var forms = require('kanso/forms'),
    types = require('kanso/types'),
    fields = require('kanso/fields');


exports['formValuesToTree'] = function (test) {
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
};

exports['parseRaw'] = function (test) {
    var Type = types.Type;
    var Field = fields.Field;

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
};

exports['parseRaw - embedded'] = function (test) {
    var Type = types.Type;
    var Field = fields.Field;

    var t1 = new Type('t1', {
        fields: {
            one: fields.string()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embed: new fields.Embedded({
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
};

exports['parseRaw - embeddedList'] = function (test) {
    var Type = types.Type;
    var Field = fields.Field;

    var t1 = new Type('t1', {
        fields: {
            one: fields.string()
        }
    });

    var t2 = new Type('t2', {
        fields: {
            embed: new fields.EmbeddedList({
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
};

exports['Form.toHTML'] = function (test) {
    var f = new forms.Form({
        one: fields.string(),
        two: fields.string()
    });
    var calls = [];
    var renderer = function () {
        this.start = function () {
            calls.push('start');
            return '';
        };
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push([field, path.join('.'), value, raw, errors]);
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
};

exports['Form.toHTML - default values'] = function (test) {
    var f = new forms.Form({
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
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push([field, path.join('.'), value, raw, errors]);
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
};

exports['Form.toHTML - existing values'] = function (test) {
    var f = new forms.Form({
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
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push([field, path.join('.'), value, raw, errors]);
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
};

exports['Form.toHTML - errors'] = function (test) {
    var err1 = {field: ['one'], msg: 'err1'};
    var err2 = {field: ['two', 'three'], msg: 'err2'};
    var err3 = {field: ['two', 'three'], msg: 'err3'};

    var f = new forms.Form({
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
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.field = function (field, path, value, raw, errors) {
            calls.push([field, path.join('.'), value, raw, errors]);
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
};

exports['Form.toHTML - embedded'] = function (test) {
    var err1 = {field: ['one'], msg: 'err1'};
    var err2 = {field: ['two', 'three'], msg: 'err2'};
    var err3 = {field: ['two', 'three'], msg: 'err3'};

    var t = new types.Type('t', {
        fields: {
            one: fields.string(),
            two: fields.string()
        }
    });
    var f = new forms.Form({
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
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.embed = function (type, path, value, raw, errors) {
            calls.push(['embed', type, path.join('.'), value, raw, errors]);
            return {
                start: function () {
                    calls.push('start2');
                    return '';
                },
                field: function (field, path, value, raw, errors) {
                    calls.push(['field', field, path.join('.'), value, raw, errors]);
                },
                end: function () {
                    calls.push('end2');
                    return '';
                }
            };
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
        ['field', t.fields._id, 'embed._id', undefined, undefined, []],
        ['field', t.fields._rev, 'embed._rev', undefined, undefined, []],
        ['field', t.fields._deleted, 'embed._deleted', undefined, undefined, []],
        ['field', t.fields.type, 'embed.type', undefined, undefined, []],
        ['field', t.fields.one, 'embed.one', undefined, undefined, []],
        ['field', t.fields.two, 'embed.two', undefined, undefined, []],
        'end2',
        'end'
    ]);
    test.done();
};

exports['Form.toHTML - embeddedList'] = function (test) {
    var err1 = {field: ['one'], msg: 'err1'};
    var err2 = {field: ['two', 'three'], msg: 'err2'};
    var err3 = {field: ['two', 'three'], msg: 'err3'};

    var t = new types.Type('t', {
        fields: {
            one: fields.string(),
            two: fields.string()
        }
    });
    var f = new forms.Form({
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
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.embedList = function (type, path, value, raw, errors) {
            calls.push(['embedList', type, path.join('.'), value, raw, errors]);
            return {
                start: function () {
                    calls.push('start2');
                    return '';
                },
                each: function (type, path, value, raw, errors) {
                    calls.push(['each', type, path.join('.'), value, raw, errors]);
                    return {
                        start: function () {
                            calls.push('start3');
                            return '';
                        },
                        field: function (field, path, value, raw, errors) {
                            calls.push(['field', field, path.join('.'), value, raw, errors]);
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
            };
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
};

exports['Form.toHTML - embeddedList - with values'] = function (test) {
    var err1 = {field: ['one'], msg: 'err1'};
    var err2 = {field: ['two', 'three'], msg: 'err2'};
    var err3 = {field: ['two', 'three'], msg: 'err3'};

    var t = new types.Type('t', {
        fields: {
            one: fields.string(),
            two: fields.string()
        }
    });
    var f = new forms.Form({
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
        this.beginGroup = function () {
            return;
        };
        this.endGroup = function () {
            return;
        };
        this.embedList = function (type, path, value, raw, errors) {
            calls.push(['embedList', type, path.join('.'), value, raw, errors]);
            return {
                start: function () {
                    calls.push('start2');
                    return '';
                },
                each: function (type, path, value, raw, errors) {
                    calls.push(['each', type, path.join('.'), value, raw, errors]);
                    return {
                        start: function () {
                            calls.push('start3');
                            return '';
                        },
                        field: function (field, path, value, raw, errors) {
                            calls.push(['field', field, path.join('.'), value, raw, errors]);
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
            };
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
        ['field', t.fields._id, 'embed.0._id', '_id', '_idraw', []],
        ['field', t.fields._rev, 'embed.0._rev', undefined, undefined, []],
        ['field', t.fields._deleted, 'embed.0._deleted', undefined, undefined, []],
        ['field', t.fields.type, 'embed.0.type', 't', 't', []],
        ['field', t.fields.one, 'embed.0.one', '1', '1raw', []],
        ['field', t.fields.two, 'embed.0.two', '2', '2raw', []],
        'end3',
        'end2',
        'end'
    ]);
    test.done();
};

exports['Form.validate - numbers'] = function (test) {
    test.expect(3);
    var f = new forms.Form({
        one: fields.number(),
        two: fields.number()
    });
    f.validate({form: {one: '1', two: '2'}});
    test.same(f.values, {one: 1, two: 2});
    test.same(f.raw, {one: '1', two: '2'});
    test.same(f.errors, []);
    test.done();
};

exports['Form.validate - empty numbers'] = function (test) {
    test.expect(1);
    var f = new forms.Form({
        one: fields.number(),
        two: fields.number()
    });
    f.validate({});
    test.strictEqual(f.isValid(), false);
    test.done();
};

exports['Form.validate - strings'] = function (test) {
    test.expect(3);
    var f = new forms.Form({
        one: fields.string(),
        two: fields.string()
    });
    f.validate({form: {one: 'one', two: 'two'}});
    test.same(f.values, {one: 'one', two: 'two'});
    test.same(f.raw, {one: 'one', two: 'two'});
    test.same(f.errors, []);
    test.done();
};

exports['Form.validate - empty strings'] = function (test) {
    test.expect(1);
    var f = new forms.Form({
        foo: fields.string({required:true}),
        bar: fields.string()
    });
    f.validate({});
    test.strictEqual(f.isValid(), false);
    test.done();
};

exports['Form.validate - error on string field'] = function (test) {
    test.expect(1);
    var req = {};
    var f = new forms.Form({
        baz: fields.string(),
        type: 'test'
    });
    try {
        f.validate(req);
    } catch (e) {
        test.equals(/not supported/i.test(e.message), true);
    }
    test.done();
};

exports['Form.validate - options.exclude'] = function (test) {
    test.expect(2);
    var req = {};
    var f = new forms.Form({
        foo: fields.string(),
        bar: fields.number(),
        baz: fields.number()},
        null, { exclude: ['bar', 'baz'] }
    );

    f.validate(req);
    test.strictEqual(f.isValid(), false); // broken

    req = { foo: 'hi' };
    f.validate(req);
    test.strictEqual(f.isValid(), true);

    test.done();
};

exports['Form.validate - options.fields'] = function (test) {
    test.expect(2);
    var req = {};
    var f = new forms.Form({
        foo: fields.string(),
        bar: fields.number(),
        baz: fields.number()
    }, null, { fields: ['foo'] });

    f.validate(req);
    test.strictEqual(f.isValid(), false);

    req = { foo: 'hi' };
    f.validate(req);
    test.strictEqual(f.isValid(), true);

    test.done();
};

exports['Form.isValid'] = function (test) {
    var f = new forms.Form();
    f.errors = [];
    test.strictEqual(f.isValid(), true);
    f.errors = ['error'];
    test.strictEqual(f.isValid(), false);
    test.done();
};

exports['Form parse options.exclude param'] = function (test) {
    test.expect(3);
    var options = { exclude: ['baz'] };
    var form = new forms.Form({ 
        foo: fields.string(),
        bar: fields.string(),
        baz: fields.number() }, null, options);
    test.strictEqual('foo' in form.fields, true);
    test.strictEqual('bar' in form.fields, true);
    test.strictEqual('baz' in form.fields, false);
    test.done();
}

exports['Form parse options.fields param'] = function (test) {
    test.expect(3);
    var options = { fields: ['bar','baz'] };
    var form = new forms.Form({
        foo: fields.string(),
        bar: fields.string(),
        baz: fields.number() }, null, options);
    test.strictEqual('foo' in form.fields, false);
    test.strictEqual('bar' in form.fields, true);
    test.strictEqual('baz' in form.fields, true);
    test.done();
};
