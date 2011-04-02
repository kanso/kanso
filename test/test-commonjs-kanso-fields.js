var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};
var mcache2 = {}
var mcache3 = {}

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
                        testing.testRequire(
                            'kanso/permissions', mcache3, context, {}, function (err, permissions) {
                                if (err) {
                                    return cb(err);
                                }
                                that.permissions = permissions;
                                cb();
                            }
                        );
                    }
                );
            }
        );
    },

    'Field - defaults': function (test) {
        var Field = this.fields.Field;
        var f = new Field();
        test.same(f.validators, []);
        test.same(f.permissions, {});
        test.strictEqual(f.required, true);
        test.done();
    },

    'Field.validate': function (test) {
        var Field = this.fields.Field;
        var call_order = [];
        var err1 = new Error('test error 1');
        var err2 = new Error('test error 2');
        var f = new Field({
            validators: [
                function (doc, value, raw) {
                    test.equal(doc, 'doc');
                    test.equal(value, 'value');
                    test.equal(raw, 'raw');
                    call_order.push('one');
                },
                function (doc, value, raw) {
                    test.equal(doc, 'doc');
                    test.equal(value, 'value');
                    test.equal(raw, 'raw');
                    call_order.push('two');
                    throw err1;
                },
                function (doc, value, raw) {
                    test.equal(doc, 'doc');
                    test.equal(value, 'value');
                    test.equal(raw, 'raw');
                    call_order.push('three');
                    throw err2;
                }
            ]
        });
        var errs = f.validate('doc', 'value', 'raw');
        test.same(call_order, ['one', 'two', 'three']);
        test.same(errs, [err1, err2]);
        test.done();
    },

    'Field.validate - return arrays': function (test) {
        var Field = this.fields.Field;
        var f = new Field({
            validators: [
                function (doc, value, raw) {
                    return [1,2]
                },
                function (doc, value, raw) {
                    return [3];
                }
            ]
        });
        var errs = f.validate('doc', 'value', 'raw');
        test.same(errs, [1, 2, 3]);
        test.done();
    },

    'Field.validate - don\'t validate empty fields': function (test) {
        var Field = this.fields.Field;
        var f = new Field({
            required: false,
            validators: [function () {
                test.ok(false, 'don\'t call validator');
                throw new Error('test');
            }]
        });
        f.isEmpty = function (value, raw) {
            test.equal(value, 'value');
            test.equal(raw, 'raw');
            return true;
        };
        test.same(f.validate('doc', 'value', 'raw'), []);
        test.done();
    },

    'Field.validate - check if required on empty value': function (test) {
        var Field = this.fields.Field;
        var f = new Field({
            required: true,
            validators: [function () {
                test.ok(false, 'don\'t call validator');
                throw new Error('test');
            }]
        });
        f.isEmpty = function (value, raw) {
            test.equal(value, 'value');
            test.equal(raw, 'raw');
            return true;
        };
        var errs = f.validate('doc', 'value', 'raw');
        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'Required field');
        test.done();
    },

    'Field.authorize - permissions is a function': function (test) {
        var Field = this.fields.Field;
        var err = new Error('test permissions error');
        var f = new Field({
            permissions: function (newDoc, oldDoc, newVal, oldVal, user) {
                test.equal(newDoc, 'newDoc');
                test.equal(oldDoc, 'oldDoc');
                test.equal(newVal, 'newVal');
                test.equal(oldVal, 'oldVal');
                test.equal(user, 'user');
                throw err;
            }
        });
        var errs = f.authorize('newDoc', 'oldDoc', 'newVal', 'oldVal', 'user');
        test.same(errs, [err]);
        test.done();
    },

    'Field.authorize - permissions as an object': function (test) {
        var Field = this.fields.Field;
        var calls = [];
        var err1 = new Error('test error 1');
        var err2 = new Error('test error 2');
        var err3 = new Error('test error 3');
        var f = new Field({
            permissions: {
                create: function (newDoc, oldDoc, newVal, oldVal, user) {
                    test.equal(newDoc, 'newDoc');
                    test.equal(oldDoc, null);
                    test.equal(newVal, 'newVal');
                    test.equal(oldVal, null);
                    test.equal(user, 'user');
                    calls.push('create');
                    throw err1;
                },
                edit: function (newDoc, oldDoc, newVal, oldVal, user) {
                    test.equal(newDoc, 'newDoc');
                    test.equal(oldDoc, 'oldDoc');
                    test.equal(newVal, 'newVal');
                    test.equal(oldVal, 'oldVal');
                    test.equal(user, 'user');
                    calls.push('edit');
                    throw err2;
                },
                delete: function (newDoc, oldDoc, newVal, oldVal, user) {
                    test.same(newDoc, {_deleted: true});
                    test.equal(oldDoc, 'oldDoc');
                    test.equal(newVal, null);
                    test.equal(oldVal, 'oldVal');
                    test.equal(user, 'user');
                    calls.push('delete');
                    throw err3;
                }
            }
        });
        test.same(
            f.authorize('newDoc', null, 'newVal', null, 'user'),
            [err1]
        );
        test.same(
            f.authorize('newDoc', 'oldDoc', 'newVal', 'oldVal', 'user'),
            [err2]
        );
        test.same(
            f.authorize({_deleted: true}, 'oldDoc', null, 'oldVal', 'user'),
            [err3]
        );
        test.same(calls, ['create', 'edit', 'delete']);
        test.done();
    },

    'Embedded - defaults': function (test) {
        var Embedded = this.fields.Embedded;
        var e = new Embedded({type: 'type'});
        test.equal(e.type, 'type');
        test.equal(e.required, true);
        test.done();
    },

    'Embedded - no type': function (test) {
        test.expect(1);
        var Embedded = this.fields.Embedded;
        try {
            new Embedded();
        }
        catch (err) {
            test.equal(err.message, 'No type specified');
        }
        test.done();
    },

    'Embedded.validate': function (test) {
        var Embedded = this.fields.Embedded;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var t = new Type({
            fields: {
                one: new Field(),
                two: new Field()
            }
        });

        var e = new Embedded({type: t});
        var doc = {embeddedThing: {_id: 'id', one: 'asdf'}};

        var errs = e.validate(doc, doc.embeddedThing, doc.embeddedThing);
        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'Required field');
        test.same(errs[0].field, ['two']);
        test.done();
    },

    'Embedded.validate - no id': function (test) {
        var Embedded = this.fields.Embedded;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var t = new Type({
            fields: {
                one: new Field(),
                two: new Field()
            }
        });

        var e = new Embedded({type: t});
        var doc = {embeddedThing: {one: 'asdf', two: 'asdf'}};

        var errs = e.validate(doc, doc.embeddedThing, doc.embeddedThing);
        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'Embedded document missing _id');
        test.done();
    },

    'Embedded.authorize - permissions as an object': function (test) {
        var Field = this.fields.Field;
        var Embedded = this.fields.Embedded;
        var Type = this.types.Type;

        var calls = [];
        var err1 = new Error('test error 1');
        var err2 = new Error('test error 2');
        var err3 = new Error('test error 3');

        var newDoc = {embed: {test: 'newVal'}};
        var oldDoc = {embed: {test: 'oldVal'}};

        var f = new Field({
            permissions: {
                create: function (nDoc, oDoc, newVal, oldVal, user) {
                    test.same(nDoc, newDoc.embed);
                    test.equal(oDoc, null);
                    test.equal(newVal, 'newVal');
                    test.equal(oldVal, null);
                    test.equal(user, 'user');
                    calls.push('create');
                    throw err1;
                },
                edit: function (nDoc, oDoc, newVal, oldVal, user) {
                    test.same(nDoc, newDoc.embed);
                    test.same(oDoc, oldDoc.embed);
                    test.equal(newVal, 'newVal');
                    test.equal(oldVal, 'oldVal');
                    test.equal(user, 'user');
                    calls.push('edit');
                    throw err2;
                },
                delete: function (nDoc, oDoc, newVal, oldVal, user) {
                    test.same(nDoc, {_deleted: true});
                    test.equal(oDoc, oldDoc.embed);
                    test.equal(newVal, null);
                    test.equal(oldVal, 'oldVal');
                    test.equal(user, 'user');
                    calls.push('delete');
                    throw err3;
                }
            }
        });

        var t = new Type({
            fields: {
                test: f
            }
        });

        var e = new Embedded({
            type: t
        });

        var errs = e.authorize(
            newDoc, null, newDoc.embed, null, 'user'
        );
        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'test error 1');
        test.same(errs[0].field, ['test']);
        test.same(calls, ['create']);

        var errs = e.authorize(
            newDoc, oldDoc, newDoc.embed, oldDoc.embed, 'user'
        );
        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'test error 2');
        test.same(errs[0].field, ['test']);
        test.same(calls, ['create', 'edit']);

        newDoc = {embed: {_deleted: true}};
        var errs = e.authorize(
            newDoc, oldDoc, newDoc.embed, oldDoc.embed, 'user'
        );
        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'test error 3');
        test.same(errs[0].field, ['test']);
        test.same(calls, ['create', 'edit', 'delete']);

        test.done();
    },

    'Embedded.authorize - delete without _delete property': function (test) {
        var Field = this.fields.Field;
        var Embedded = this.fields.Embedded;
        var Type = this.types.Type;

        var err = new Error('test error');

        var newDoc = {embed: {test: 'newVal'}};
        var oldDoc = {embed: {test: 'oldVal'}};

        var f = new Field({
            permissions: {
                delete: function (nDoc, oDoc, newVal, oldVal, user) {
                    test.same(nDoc, {_deleted: true});
                    test.equal(oDoc, oldDoc.embed);
                    test.equal(newVal, null);
                    test.equal(oldVal, 'oldVal');
                    test.equal(user, 'user');
                    throw err;
                }
            }
        });

        var t = new Type({
            fields: {
                test: f
            }
        });

        var e = new Embedded({
            required: false,
            type: t
        });

        newDoc = {};
        var errs = e.authorize(
            newDoc, oldDoc, newDoc.embed, oldDoc.embed, 'user'
        );
        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'test error');
        test.same(errs[0].field, ['test']);

        test.done();
    },

    'EmbeddedList - defaults': function (test) {
        var EmbeddedList = this.fields.EmbeddedList;
        var e = new EmbeddedList({type: 'type'});
        test.equal(e.type, 'type');
        test.equal(e.required, true);
        test.done();
    },

    'EmbeddedList - no type': function (test) {
        test.expect(1);
        var EmbeddedList = this.fields.EmbeddedList;
        try {
            new EmbeddedList();
        }
        catch (err) {
            test.equal(err.message, 'No type specified');
        }
        test.done();
    },

    'EmbeddedList.validate': function (test) {
        var EmbeddedList = this.fields.EmbeddedList;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var t = new Type({
            fields: {
                one: new Field(),
                two: new Field()
            }
        });

        var e = new EmbeddedList({type: t});
        var doc = {embeddedThing: [
            {_id: 'id1', one: 'asdf'},
            {_id: 'id2', two: 'asdf'}
        ]};

        var errs = e.validate(doc, doc.embeddedThing, doc.embeddedThing);
        test.equal(errs.length, 2);
        test.equal(errs[0].message, 'Required field');
        test.same(errs[0].field, ['0','two']);
        test.equal(errs[1].message, 'Required field');
        test.same(errs[1].field, ['1','one']);
        test.done();
    },

    'EmbeddedList.validate - missing IDs': function (test) {
        var EmbeddedList = this.fields.EmbeddedList;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var t = new Type({
            fields: {
                one: new Field(),
                two: new Field()
            }
        });

        var e = new EmbeddedList({type: t});
        var doc = {embeddedThing: [
            {one: 'asdf'},
            {two: 'asdf'}
        ]};

        var errs = e.validate(doc, doc.embeddedThing, doc.embeddedThing);
        test.equal(errs.length, 2);
        test.equal(errs[0].message, 'Embedded document missing _id');
        test.same(errs[0].field, ['0']);
        test.equal(errs[1].message, 'Embedded document missing _id');
        test.same(errs[1].field, ['1']);
        test.done();
    },

    'EmbeddedList.validate - duplicate IDs': function (test) {
        var EmbeddedList = this.fields.EmbeddedList;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var t = new Type({
            fields: {
                one: new Field(),
                two: new Field()
            }
        });

        var e = new EmbeddedList({type: t});
        var doc = {embeddedThing: [
            {_id: 'id', one: 'asdf'},
            {_id: 'id', two: 'asdf'}
        ]};

        var errs = e.validate(doc, doc.embeddedThing, doc.embeddedThing);
        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'Embedded document duplicates an existing _id');
        test.same(errs[0].field, ['1']);
        test.done();
    },

    'EmbeddedList.authorize - type permissions as a function': function (test) {
        var EmbeddedList = this.fields.EmbeddedList;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var calls = [];
        var t1 = new Type({
            permissions: function (nd, od, nv, ov, user) {
                calls.push(Array.prototype.slice.call(arguments));
                throw new Error('test error');
            },
            fields: {
                one: new Field()
            }
        });
        var t2 = new Type({
            fields: {
                embedded: new EmbeddedList({
                    type: t1
                })
            }
        });

        // Two edits
        var oldDoc = {embedded: [
            {_id: 'id1', one: 'asdf'},
            {_id: 'id2', one: 'asdf'}
        ]};
        var newDoc = {embedded: [
            {_id: 'id1', one: 'asdf2'},
            {_id: 'id2', one: 'asdf2'}
        ]};

        var errs = t2.authorize(newDoc, oldDoc, 'user');
        test.same(calls, [
            [newDoc.embedded[0], oldDoc.embedded[0], null, null, 'user'],
            [newDoc.embedded[1], oldDoc.embedded[1], null, null, 'user']
        ]);
        test.equal(errs.length, 2);
        test.same(errs[0].field, ['embedded','0']);
        test.same(errs[1].field, ['embedded','1']);

        // One delete
        var calls = [];
        var oldDoc = {embedded: [
            {_id: 'id1', one: 'asdf'},
            {_id: 'id2', one: 'asdf'}
        ]};
        var newDoc = {embedded: [
            {_id: 'id1', one: 'asdf'}
        ]};

        var errs = t2.authorize(newDoc, oldDoc, 'user');
        test.same(calls, [
            [newDoc.embedded[0], oldDoc.embedded[0], null, null, 'user'],
            [{_deleted: true}, oldDoc.embedded[1], null, null, 'user']
        ]);
        test.equal(errs.length, 2);
        test.same(errs[0].field, ['embedded','0']);
        test.same(errs[1].field, ['embedded','1']);

        // One add
        var calls = [];
        var oldDoc = {embedded: [
            {_id: 'id1', one: 'asdf'}
        ]};
        var newDoc = {embedded: [
            {_id: 'id1', one: 'asdf'},
            {_id: 'id2', one: 'asdf'}
        ]};

        var errs = t2.authorize(newDoc, oldDoc, 'user');
        test.same(calls, [
            [newDoc.embedded[0], oldDoc.embedded[0], null, null, 'user'],
            [newDoc.embedded[1], oldDoc.embedded[1], null, null, 'user']
        ]);
        test.equal(errs.length, 2);
        test.same(errs[0].field, ['embedded','0']);
        test.same(errs[1].field, ['embedded','1']);

        test.done();
    },

    'EmbeddedList.authorize - type permissions as an object': function (test) {
        var EmbeddedList = this.fields.EmbeddedList;
        var Field = this.fields.Field;
        var Type = this.types.Type;

        var calls = [];
        var t1 = new Type({
            permissions: {
                create: function () {
                    calls.push('create');
                },
                edit: function () {
                    calls.push('edit');
                },
                delete: function () {
                    calls.push('delete');
                }
            },
            fields: {
                one: new Field()
            }
        });
        var t2 = new Type({
            fields: {
                embedded: new EmbeddedList({
                    type: t1
                })
            }
        });

        // Two edits
        var oldDoc = {embedded: [
            {_id: 'id1', one: 'asdf'},
            {_id: 'id2', one: 'asdf'}
        ]};
        var newDoc = {embedded: [
            {_id: 'id1', one: 'asdf2'},
            {_id: 'id2', one: 'asdf2'}
        ]};

        var errs = t2.authorize(newDoc, oldDoc, 'user');
        test.same(calls, ['edit', 'edit']);

        // One delete
        var calls = [];
        var oldDoc = {embedded: [
            {_id: 'id1', one: 'asdf'},
            {_id: 'id2', one: 'asdf'}
        ]};
        var newDoc = {embedded: [
            {_id: 'id1', one: 'asdf'}
        ]};

        var errs = t2.authorize(newDoc, oldDoc, 'user');
        test.same(calls, ['edit', 'delete']);

        // One add
        var calls = [];
        var oldDoc = {embedded: [
            {_id: 'id1', one: 'asdf'}
        ]};
        var newDoc = {embedded: [
            {_id: 'id1', one: 'asdf'},
            {_id: 'id2', one: 'asdf'}
        ]};

        var errs = t2.authorize(newDoc, oldDoc, 'user');
        test.same(calls, ['edit', 'create']);

        test.done();
    },

    'EmbeddedList.authorize - parent-level - testuser edit': function (test) {
        var types = this.types,
            fields = this.fields,
            permissions = this.permissions,
            Type = this.types.Type;

        var comment = new Type({
            permissions: {
                create: permissions.loggedIn(),
                edit: permissions.usernameMatchesField('creator'),
                delete: permissions.usernameMatchesField('creator')
            },
            fields: {
                creator: fields.creator(),
                msg: fields.string()
            }
        });

        var t = new Type({
            fields: {
                creator: fields.creator(),
                embedded: fields.embedList({
                    permissions: {
                        delete: permissions.any([
                            permissions.usernameMatchesField('creator'),
                            permissions.inherit(comment)
                        ])
                    },
                    type: comment
                })
            }
        });

        // testuser should not be able to edit testuser2's comment
        var newDoc = {
            creator: 'testuser',
            embedded: [{_id: 'id1', creator: 'testuser2', msg: 'test2'}]
        };
        var oldDoc = {
            creator: 'testuser',
            embedded: [{_id: 'id1', creator: 'testuser2', msg: 'test1'}]
        };
        var userCtx = {name: 'testuser'};

        var errs = t.authorize(newDoc, oldDoc, userCtx);
        test.equal(errs.length, 1);
        test.equal(errs[0].message, 'Username does not match field creator');
        test.same(errs[0].field, ['embedded', '0']);

        test.done();
    },

    'EmbeddedList.authorize - parent-level - testuser2 edit': function (test) {
        var types = this.types,
            fields = this.fields,
            permissions = this.permissions,
            Type = this.types.Type;

        var comment = new Type({
            permissions: {
                create: permissions.loggedIn(),
                edit: permissions.usernameMatchesField('creator'),
                delete: permissions.usernameMatchesField('creator')
            },
            fields: {
                creator: fields.creator(),
                msg: fields.string()
            }
        });

        var t = new Type({
            fields: {
                creator: fields.creator(),
                embedded: fields.embedList({
                    permissions: {
                        delete: permissions.any([
                            permissions.usernameMatchesField('creator'),
                            permissions.inherit(comment)
                        ])
                    },
                    type: comment
                })
            }
        });

        // testuser2 should be able to edit testuser2's content
        var newDoc = {
            creator: 'testuser',
            embedded: [{_id: 'id1', creator: 'testuser2', msg: 'test2'}]
        };
        var oldDoc = {
            creator: 'testuser',
            embedded: [{_id: 'id1', creator: 'testuser2', msg: 'test1'}]
        };

        var userCtx = {name: 'testuser2'};
        var errs = t.authorize(newDoc, oldDoc, userCtx);
        test.equal(errs.length, 0);

        test.done();
    },

    'EmbeddedList.authorize - parent-level - testuser2 delete': function (test) {
        var types = this.types,
            fields = this.fields,
            permissions = this.permissions,
            Type = this.types.Type;

        var comment = new Type({
            permissions: {
                create: permissions.loggedIn(),
                edit: permissions.usernameMatchesField('creator'),
                delete: permissions.usernameMatchesField('creator')
            },
            fields: {
                creator: fields.creator(),
                msg: fields.string()
            }
        });

        var t = new Type({
            fields: {
                creator: fields.creator(),
                embedded: fields.embedList({
                    permissions: {
                        delete: permissions.any([
                            permissions.usernameMatchesField('creator'),
                            permissions.inherit(comment)
                        ])
                    },
                    type: comment
                })
            }
        });

        // testuser2 should be able to delete own comment
        var newDoc = {creator: 'testuser', embedded: []};
        var oldDoc = {
            creator: 'testuser',
            embedded: [{_id: 'id1', creator: 'testuser2', msg: 'test1'}]
        };
        var userCtx = {name: 'testuser2'};
        var errs = t.authorize(newDoc, oldDoc, userCtx);
        test.equal(errs.length, 0);

        test.done();
    },

    'EmbeddedList.authorize - parent-level - testuser delete': function (test) {
        var types = this.types,
            fields = this.fields,
            permissions = this.permissions,
            Type = this.types.Type;

        var comment = new Type({
            permissions: {
                create: permissions.loggedIn(),
                edit: permissions.usernameMatchesField('creator'),
                delete: permissions.usernameMatchesField('creator')
            },
            fields: {
                creator: fields.creator(),
                msg: fields.string()
            }
        });

        var t = new Type({
            fields: {
                creator: fields.creator(),
                embedded: fields.embedList({
                    permissions: {
                        delete: permissions.any([
                            permissions.usernameMatchesField('creator'),
                            permissions.inherit(comment)
                        ])
                    },
                    type: comment
                })
            }
        });

        // testuser should also be able to delete testuser2's content
        var newDoc = {creator: 'testuser', embedded: []};
        var oldDoc = {
            creator: 'testuser',
            embedded: [{_id: 'id1', creator: 'testuser2', msg: 'test1'}]
        };
        var userCtx = {name: 'testuser'};
        var errs = t.authorize(newDoc, oldDoc, userCtx);
        test.equal(errs.length, 0);

        test.done();
    },

    'string': function (test) {
        var f = this.fields.string();
        test.strictEqual(f.parse(123), '123');
        test.strictEqual(f.parse('asdf'), 'asdf');
        test.done();
    },

    'number': function (test) {
        var f = this.fields.number();
        test.strictEqual(f.parse(123), 123);
        test.strictEqual(f.parse('123'), 123);
        test.strictEqual(f.parse('0123'), 123);
        test.ok(isNaN(f.parse('asdf')));
        test.ok(isNaN(f.parse('')));
        test.ok(isNaN(f.parse(null)));
        test.ok(isNaN(f.parse(undefined)));

        test.same(f.validate({}, 123, '123'), []);
        test.equal(f.validate({}, NaN, '').length, 1);

        test.done();
    },

    'boolean': function (test) {
        var f = this.fields.boolean();
        test.strictEqual(f.required, false);
        test.strictEqual(f.parse(null), false);
        test.strictEqual(f.parse(undefined), false);
        test.strictEqual(f.parse(''), false);
        test.strictEqual(f.parse('true'), true);
        test.strictEqual(f.parse(false), false);
        test.strictEqual(f.parse(true), true);
        test.strictEqual(f.parse(1), true);
        test.done();
    },

    'url': function (test) {
        var f = this.fields.url();
        test.equal(f.validate({}, 'asdf', 'asdf').length, 1);
        test.equal(
            f.validate({}, 'http://google.com', 'http://google.com').length,
            0
        );
        test.done();
    },

    'email': function (test) {
        var f = this.fields.email();
        test.equal(f.validate({}, 'asdf', 'asdf').length, 1);
        test.equal(f.validate({}, 'asdf@asdf.com', 'asdf@asdf.com').length, 0);
        test.done();
    },

    'creator': function (test) {
        var f = this.fields.creator();
        var userCtx = {name: 'testuser'};
        // does not throw
        f.permissions.create({}, {}, 'testuser', null, userCtx);
        test.throws(function () {
            f.permissions.create({}, {}, 'testuser2', null, userCtx);
        });
        test.throws(function () {
            f.permissions.edit({}, {}, 'testuser', null, userCtx);
        });
        test.throws(function () {
            f.permissions.edit({}, {}, 'testuser2', null, userCtx);
        });
        test.strictEqual(f.permissions.delete, undefined);
        // required should be false by default because anonymous users will
        // set to empty
        test.strictEqual(f.required, false);
        test.done();
    },

    'creator - existing permissions': function (test) {
        var calls = [];
        var f = this.fields.creator({
            permissions: {
                create: function () { calls.push('create'); },
                edit:   function () { calls.push('edit'); },
                delete: function () { calls.push('delete'); }
            }
        });
        var userCtx = {name: 'testuser'};
        // does not throw
        f.permissions.create({}, {}, 'testuser', null, userCtx);
        test.equal(
            f.permissions.create({}, {}, 'testuser2', null, userCtx).length, 1
        );
        test.equal(
            f.permissions.edit({}, {}, 'testuser', null, userCtx).length, 1
        );
        test.equal(
            f.permissions.edit({}, {}, 'testuser2', null, userCtx).length, 1
        );
        f.permissions.delete();
        test.same(calls, ['create','create','edit','edit','delete']);
        // required should be false by default because anonymous users will
        // set to empty
        test.strictEqual(f.required, false);
        test.done();
    },

    'timestamp': function (test) {
        var f = this.fields.timestamp();
        // should be uneditable
        f.permissions.edit({}, {}, 'val', 'val', 'user');
        test.throws(function () {
            f.permissions.edit({}, {}, 'val', 'val2', 'user');
        });
        // should keep any previous permissions
        var calls = [];
        f = this.fields.timestamp({
            permissions: {
                create: function () { calls.push('create'); },
                edit:   function () { calls.push('edit'); },
                delete: function () { calls.push('delete'); }
            }
        });
        f.permissions.create({}, {}, 'val', 'val', 'user');
        f.permissions.edit({}, {}, 'val', 'val', 'user');
        f.permissions.delete({}, {}, 'val', 'val', 'user');
        test.same(calls, ['create','edit','delete']);
        test.done();
    },

    'choice': function (test) {
        // throw when no values defined in options
        test.throws(function () { this.fields.choice(); });

        var f = this.fields.choice({
            values: ['a','b','c']
        });
        // should not return errors
        test.equal(f.validate({},'a').length, 0);
        test.equal(f.validate({},'b').length, 0);
        test.equal(f.validate({},'c').length, 0);
        // should return errors
        test.equal(f.validate({},'d').length, 1);
        test.done();
    },

    'choice - labels': function (test) {
        // throw when no values defined in options
        test.throws(function () { this.fields.choice(); });

        var f = this.fields.choice({
            values: [['a','A'],['b','B'],'c']
        });
        // should not return errors
        test.equal(f.validate({},'a').length, 0);
        test.equal(f.validate({},'b').length, 0);
        test.equal(f.validate({},'c').length, 0);
        // should return errors
        test.equal(f.validate({},'d').length, 1);
        test.done();
    },

    'numberChoice': function (test) {
        // throw when no values defined in options
        test.throws(function () { this.fields.numberChoice(); });

        var f = this.fields.numberChoice({
            values: [1,2,3]
        });
        // should not return errors
        test.equal(f.validate({},1).length, 0);
        test.equal(f.validate({},2).length, 0);
        test.equal(f.validate({},3).length, 0);
        // should return errors
        test.equal(f.validate({},4).length, 1);
        test.equal(f.validate({},NaN).length, 2);
        test.done();
    },

    'embed': function (test) {
        var f = this.fields.embed({type: 'sometype'});
        test.ok(f instanceof this.fields.Embedded);
        test.done();
    },

    'embedList': function (test) {
        var f = this.fields.embedList({type: 'sometype'});
        test.ok(f instanceof this.fields.EmbeddedList);
        test.done();
    }

});
