/**
 * Module dependencies
 */

var fields = require('./fields'),
    widgets = require('./widgets'),
    utils = require('./utils'),
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
            permissions: [
                function (newDoc, oldDoc, newVal, oldVal, userCtx) {
                    if (oldDoc) {
                        if (newVal !== oldVal) {
                            throw new Error(
                                'Cannot change type field after document has ' +
                                'been created'
                            );
                        }
                    }
                }
            ]
        }),
        type: fields.string({
            default_value: name,
            widget: widgets.hidden(),
            validators: [function (doc, value) {
                if (value !== name) {
                    throw new Error('Unexpected value for type');
                }
            }]
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
    var validation_errors = exports.validateFields(
        this.fields, doc, doc, [], this.allow_extra_fields
    );
    var required_errors = exports.checkRequired(this.fields, doc, []);
    return required_errors.concat(validation_errors);
};

var testPerms = function (fns, newDoc, oldDoc, userCtx) {
    var errors = [];
    if (!utils.isArray(fns)) {
        fns = [fns];
    }
    _.each(fns, function (fn) {
        try {
            fn(newDoc, oldDoc, null, null, userCtx);
        }
        catch (err) {
            errors.push(err);
        }
    });
    return errors;
};

Type.prototype.authorize = function (newDoc, oldDoc, userCtx) {
    var errors = [];
    var perms = this.permissions
    if (perms) {
        if (newDoc._deleted && perms.delete) {
            errors = errors.concat(
                testPerms(perms.delete, newDoc, oldDoc, userCtx)
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
 * Iterates over fields, checking for an associated value if the field is
 * required.
 *
 * @param {Object} fields
 * @param {Object} values
 * @param {Array} path
 * @return {Array}
 */

exports.checkRequired = function (fields, values, path) {
    var errors = [];

    for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
            var f = fields[k];
            var f_path = path.concat([k]);
            // TODO: when a module cache is implemented in couchdb, we can
            // change this to an instanceof check. until then instanceof
            // checks are to be considered fragile
            if (utils.constructorName(f) === 'Field') {
                if (f.required) {
                    if (!values.hasOwnProperty(k)) {
                        var err = new Error('Required field');
                        err.field = f_path;
                        errors.push(err);
                    }
                }
            }
            else {
                // recurse through sub-objects in the type's schema to find
                // more fields
                var subvals2 = values.hasOwnProperty(k) ? values[k]: {};
                errors = errors.concat(exports.checkRequired(
                    f, subvals2, f_path
                ));
            }
        }
    }

    return errors;
};


/**
 * Iterates over values and checks against field validators, recursing through
 * sub-objects. Returns an array of validation errors, or an empty array if
 * valid.
 *
 * @param {Object} fields
 * @param {Object} values
 * @param {Object} doc
 * @param {Array} path
 * @param {Boolean} allow_extra
 * @return {Array}
 */

exports.validateFields = function (fields, values, doc, path, allow_extra) {
    var errors = [];

    for (var k in values) {
        if (values.hasOwnProperty(k)) {
            var f = fields[k];
            if (f === undefined) {
                // extra field detected
                if (!allow_extra) {
                    // check for couchdb reserved fields, and let couchdb
                    // handle the validity of those
                    if (!(path.length === 0 && k.substr(1) !== '_')) {
                        var err = new Error(
                            'Field "' + path.concat([k]).join('.') +
                            '" not defined'
                        );
                        err.field = path.concat([k]);
                        errors.push(err);
                    }
                }
            }
            // TODO: when a module cache is implemented in couchdb, we can
            // change this to an instanceof check. until then instanceof
            // checks are to be considered fragile
            else if (utils.constructorName(f) === 'Field') {
                // its a field, validate it
                try {
                    f.validate(doc, f.parse(values[k]), values[k]);
                }
                catch (e) {
                    e.field = path.concat([k]);
                    errors.push(e);
                }
            }
            else {
                // recurse through sub-objects in the type's schema to find
                // more fields
                errors = errors.concat(exports.validateFields(
                    fields[k], values[k], doc, path.concat([k]), allow_extra
                ));
            }
        }
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
            if (utils.constructorName(f) === 'Field') {
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
    var type = (oldDoc && oldDoc.type) || newDoc.type;
    if (type && types[type]) {
        var t = types[type];
        if (!newDoc._deleted) {
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
            t.validate_doc_update(newDoc, oldDoc, userCtx);
        }
    }
};
