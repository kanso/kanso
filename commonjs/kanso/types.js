/**
 * Module dependencies
 */

var fields = require('./fields'),
    widgets = require('./widgets'),
    utils = require('./utils'),
    forms = require('./forms'),
    permissions = require('./permissions'),
    _ = require('./nimble'),
    Field = fields.Field;


var Type = exports.Type = function Type(name, options) {
    if (typeof name !== 'string') {
        throw new Error('First argument must be the type name');
    }
    this.name = name;
    this.permissions = options.permissions || {};
    this.validate_doc_update = options.validate_doc_update;
    this.allow_extra_fields = options.allow_extra_fields || false;

    this.fields = {
        _id: fields.string({
            required: false,
            omit_empty: true,
            widget: widgets.hidden()
        }),
        _rev: fields.string({
            required: false,
            omit_empty: true,
            widget: widgets.hidden(),
            permissions: {
                edit: permissions.fieldUneditable()
            }
        }),
        type: fields.string({
            default_value: name,
            widget: widgets.hidden(),
            validators: {
                create: function (newDoc, oldDoc, newVal, oldVal, userCtx) {
                    if (newVal !== name) {
                        throw new Error('Unexpected value for type');
                    }
                },
                edit: permissions.fieldUneditable()
            }
        })
    };
    if (options.fields) {
        for (var k in options.fields) {
            if (options.fields.hasOwnProperty(k)) {
                this.fields[k] = options.fields[k];
            }
        }
    }
};

Type.prototype.validate = function (doc) {
    var validation_errors = forms.validateFields(
        this.fields, doc, doc, [], this.allow_extra_fields
    );
    var required_errors = forms.checkRequired(this.fields, doc, []);
    return required_errors.concat(validation_errors);
};

var testPerms = function (fn, newDoc, oldDoc, userCtx) {
    var errors = [];
    try {
        fn(newDoc, oldDoc, null, null, userCtx);
    }
    catch (err) {
        errors.push(err);
    }
    return errors;
};

Type.prototype.authorize = function (newDoc, oldDoc, userCtx) {
    var errors = [];
    var perms = this.permissions;
    if (perms) {
        if (newDoc._deleted && perms['delete']) {
            errors = errors.concat(
                testPerms(perms['delete'], newDoc, oldDoc, userCtx)
            );
        }
        else if (!oldDoc && perms.create) {
            errors = errors.concat(
                testPerms(perms.create, newDoc, oldDoc, userCtx)
            );
        }
        else if (oldDoc && perms.edit) {
            errors = errors.concat(
                testPerms(perms.edit, newDoc, oldDoc, userCtx)
            );
        }
    }
    if (!newDoc._deleted) {
        errors = errors.concat(exports.authorizeFields(
            this.fields, newDoc, oldDoc, newDoc, oldDoc, userCtx, []
        ));
    }
    return errors;
};


/**
 * Iterates over values and checks against field permissions, recursing through
 * sub-objects. Returns an array of permission errors, or an empty array if
 * valid.
 *
 * @param {Object} fields
 * @param {Object} newValues
 * @param {Object} oldValues
 * @param {Object} newDoc
 * @param {Object} oldDoc
 * @param {Object} userCtx
 * @param {Array} path
 * @return {Array}
 */

exports.authorizeFields = function (fields, newValues, oldValues, newDoc,
                                    oldDoc, userCtx, path) {
    var errors = [];

    for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
            var f = fields[k];
            // TODO: when a module cache is implemented in couchdb, we can
            // change this to an instanceof check. until then instanceof
            // checks are to be considered fragile
            if (utils.constructorName(f) === 'Field' ||
                utils.constructorName(f) === 'Embedded') {
                // its a field, validate it
                try {
                    f.authorize(
                        newDoc,
                        oldDoc,
                        newValues[k],
                        oldValues ? oldValues[k]: null,
                        userCtx
                    );
                }
                catch (e) {
                    e.field = path.concat([k]);
                    errors.push(e);
                }
            }
            else {
                // recurse through sub-objects in the type's schema to find
                // more fields
                errors = errors.concat(exports.authorizeFields(
                    fields[k],
                    newValues[k],
                    oldValues ? oldValues[k]: null,
                    newDoc,
                    oldDoc,
                    userCtx,
                    path.concat([k])
                ));
            }
        }
    }
    return errors;
};


// TODO: when circular requires are fixed in couchdb, remove types argument?
exports.validate_doc_update = function (types, newDoc, oldDoc, userCtx) {
    log('types.validate_doc_update');
    var type = (oldDoc && oldDoc.type) || newDoc.type;
    if (type && types[type]) {
        var t = types[type];
        if (!newDoc._deleted) {
            log('t.validate');
            var validation_errors = t.validate(newDoc);
            if (validation_errors.length) {
                var err = validation_errors[0];
                var msg = err.message || err.toString();
                if (err.field && err.field.length) {
                    msg = err.field.join('.') + ': ' + msg;
                }
                throw {forbidden: msg};
            }
        }
        log('t.authorize');
        var permissions_errors = t.authorize(newDoc, oldDoc, userCtx);
        if (permissions_errors.length) {
            var err2 = permissions_errors[0];
            var msg2 = err2.message || err2.toString();
            if (err2.field && err2.field.length) {
                msg2 = err2.field.join('.') + ': ' + msg2;
            }
            throw {unauthorized: msg2};
        }
        if (t.validate_doc_update) {
            log('t.validate_doc_update');
            t.validate_doc_update(newDoc, oldDoc, userCtx);
        }
    }
    log('types.validate_doc_update done');
};
