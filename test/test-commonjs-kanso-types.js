var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};
var mcache2 = {};

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
                    'kanso/types', mcache2, context, {}, function (err, types) {
                        if (err) {
                            return cb(err);
                        }
                        that.types = types;
                        cb();
                    }
                );
            }
        );
    },

    'Type - defaults': function (test) {
        var Type = this.types.Type;
        var t = new Type('t');
        test.same(Object.keys(t.fields), ['_id','_rev', '_deleted', 'type']);
        test.same(t.permissions, {});
        test.done();
    },

    'validate': function (test) {
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var args = [];
        var logArgs = function (doc, val, raw) {
            args.push([doc, val, raw]);
        };
        var neverValid = function () {
            throw new Error('never valid');
        };

        var t = new Type('t', {
            fields: {
                one: new Field({
                    validators: [logArgs]
                }),
                two: new Field({
                    validators: [logArgs, neverValid]
                }),
                three: {
                    four: {
                        five: new Field({
                            validators: [logArgs, neverValid]
                        })
                    }
                }
            }
        });

        var doc = {
            _id: 'someid',
            type: 't',
            one: 1,
            two: 2,
            three: {four: {five: 'asdf'}}
        };

        var raw = {
            type: 't',
            one: '1',
            two: '2',
            three: {four: {five: 'asdf'}}
        };

        var errs = t.validate(doc, raw);
        test.equal(errs.length, 2);
        test.same(errs[0].field, ['two']);
        test.equal(errs[0].has_field, true);
        test.same(errs[1].field, ['three', 'four', 'five']);
        test.equal(errs[1].has_field, true);
        test.done();
    },

    'validate - missing required fields': function (test) {
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var args = [];
        var logArgs = function (doc, val, raw) {
            args.push([doc, val, raw]);
        };
        var neverValid = function () {
            throw new Error('never valid');
        };

        var t = new Type('t', {
            fields: {
                one: new Field({
                    validators: [logArgs]
                })
            }
        });

        var doc = {_id: 'someid', type: 't'};
        var raw = {};

        var errs = t.validate(doc, raw);
        test.equal(errs.length, 1);
        test.same(errs[0].field, ['one']);
        test.equal(errs[0].message, 'Required field');
        test.equal(errs[0].has_field, true);
        test.done();
    },

    'validate - missing required fields - nested': function (test) {
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var args = [];
        var logArgs = function (doc, val, raw) {
            args.push([doc, val, raw]);
        };
        var neverValid = function () {
            throw new Error('never valid');
        };

        var t = new Type('t', {
            fields: {
                one: {
                    two: new Field({
                    validators: [logArgs]
                    })
                }
            }
        });

        var doc = {_id: 'someid', type: 't'};
        var raw = {};

        var errs = t.validate(doc, raw);
        test.equal(errs.length, 1);
        test.same(errs[0].field, ['one', 'two']);
        test.equal(errs[0].message, 'Required field');
        test.equal(errs[0].has_field, true);
        test.done();
    },

    'validate - field in the wrong place': function (test) {
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var args = [];
        var logArgs = function (doc, val, raw) {
            args.push([doc, val, raw]);
        };
        var neverValid = function () {
            throw new Error('never valid');
        };

        var t = new Type('t', {
            allow_extra_fields: true,
            fields: {
                one: {
                    two: new Field({
                        validators: [logArgs]
                    })
                }
            }
        });

        var doc = {_id: 'someid', type: 't', one: 'blah', asdf: {two: 123}};
        var raw = {one: 'blah', asdf: {two: '123'}};

        var errs = t.validate(doc, raw);
        test.equal(errs.length, 1);
        test.same(errs[0].field, ['one']);
        test.equal(errs[0].message, 'Unexpected property');
        test.equal(errs[0].has_field, false);
        // asdf.two is not covered by the fieldset, so unexpected properties
        // don't matter.
        test.done();
    },

    'validate - extra values': function (test) {
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var args = [];
        var logArgs = function (doc, val, raw) {
            args.push([doc, val, raw]);
        };
        var neverValid = function () {
            throw new Error('never valid');
        };

        var t = new Type('t', {
            fields: {
                one: new Field({
                    validators: [logArgs]
                })
            }
        });

        var doc = {_id: 'someid', type: 't', one: 'blah', asdf: {two: 123}};
        var raw = {type: 't', one: 'blah', asdf: {two: '123'}};

        var errs = t.validate(doc, raw);
        test.equal(errs.length, 1);
        test.same(errs[0].field, ['asdf']);
        test.equal(errs[0].message, 'Unexpected property');
        test.equal(errs[0].has_field, false);
        // asdf.two is not covered by the fieldset, so unexpected properties
        // don't matter.
        test.done();
    },

    'validate Embedded': function (test) {
        var Embedded = this.fields.Embedded;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var t1 = new Type('t1', {
            fields: {
                one: new Field(),
                two: new Field()
            }
        });

        var t2 = new Type('t2', {
            fields: {
                embeddedT1: new Embedded({
                    type: t1
                })
            }
        });

        var doc = {type: 't1', embeddedT1: {
            _id: 'id1', type: 't2', one: 'one', two: 'two'
        }};
        var raw = {type: 't1', embeddedT1: {
            _id: 'id1', type: 't2', one: 'one', two: 'two'
        }};
        var errs = t2.validate(doc, raw);

        test.same(errs, []);
        test.done();
    },

    'validate Embedded - missing fields': function (test) {
        var Embedded = this.fields.Embedded;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var t1 = new Type('t1', {
            fields: {
                one: new Field(),
                two: new Field()
            }
        });

        var t2 = new Type('t2', {
            fields: {
                embeddedT1: new Embedded({
                    type: t1
                })
            }
        });

        var doc = {type: 't1', embeddedT1: {type: 't2', _id: 'id1', one: 'one'}};
        var raw = {type: 't1', embeddedT1: {type: 't2', _id: 'id1', one: 'one'}};
        var errs = t2.validate(doc, raw);

        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'Required field');
        test.same(errs[0].field, ['embeddedT1', 'two']);
        test.done();
    },

    'validate EmbeddedList': function (test) {
        var EmbeddedList = this.fields.EmbeddedList;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var t1 = new Type('t1', {
            fields: {
                one: new Field(),
                two: new Field()
            }
        });

        var t2 = new Type('t2', {
            fields: {
                embeds: new EmbeddedList({
                    type: t1
                })
            }
        });

        var doc = {type: 't1', embeds: [
            {type: 't2', _id: 'id1', one: 'one', two: 'two'},
            {type: 't2', _id: 'id2', one: 'one'},
        ]};
        var errs = t2.validate(doc, doc);

        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'Required field');
        test.same(errs[0].field, ['embeds', '1', 'two']);
        test.done();
    },

    'authorize': function (test) {
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var type_perms_err = new Error('type-level permissions error');
        var perms_err = new Error('test permissions error');

        var oldDoc = {type: 't', _id: 'someid', _rev: '1', one: 'oVal'};
        var newDoc = {type: 't', _id: 'someid', _rev: '2', one: 'nVal'};

        var t = new Type('t', {
            permissions: function () {
                throw type_perms_err;
            },
            fields: {
                one: new Field({
                    permissions: function (nDoc, oDoc, nVal, oVal, user) {
                        test.same(nDoc, newDoc);
                        test.same(oDoc, oldDoc);
                        test.equal(nVal, 'nVal');
                        test.equal(oVal, 'oVal');
                        test.equal(user, 'user');
                        throw perms_err;
                    }
                })
            }
        });
        var errs = t.authorize(newDoc, oldDoc, 'user');

        test.equal(errs.length, 2);
        test.equal(errs[0].message, 'type-level permissions error');
        test.ok(!errs[0].has_field);
        test.same(errs[1].field, ['one']);
        test.equal(errs[1].has_field, true);
        test.done();
    },

    'authorize - type-level create, edit, delete': function (test) {
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var perms_err = new Error('test permissions error');

        var calls = [];
        var t = new Type('t', {
            permissions: {
                create: function () {
                    calls.push('create');
                    throw perms_err;
                },
                edit: function () {
                    calls.push('edit');
                    throw perms_err;
                },
                delete: function () {
                    calls.push('delete');
                    throw perms_err;
                }
            },
            fields: {}
        });

        var oldDoc = null;
        var newDoc = {type: 't', _id: 'id', _rev: '2'};
        var errs = t.authorize(newDoc, oldDoc, 'user');

        test.equal(errs.length, 1);
        test.same(calls, ['create']);

        oldDoc = {type: 't', _id: 'id', _rev: '1'};
        newDoc = {type: 't', _id: 'id', _rev: '2'};
        errs = t.authorize(newDoc, oldDoc, 'user');

        test.equal(errs.length, 1);
        test.same(calls, ['create', 'edit']);

        oldDoc = {type: 't', _id: 'id', _rev: '1'};
        newDoc = {_deleted: true};
        errs = t.authorize(newDoc, oldDoc, 'user');

        test.equal(errs.length, 1);
        test.same(calls, ['create', 'edit', 'delete']);

        test.done();
    }

});
