/**
 * Module dependencies
 */

var fields = require('./fields'),
    widgets = require('./widgets'),
    utils = require('./utils'),
    Field = fields.Field;


var Type = exports.Type = function (name, options) {
    if (typeof name !== 'string') {
        throw new Error('First argument must be the type name');
    }
    this.name = name;
    this.permissions = options.permissions || {};
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
            widget: widgets.hidden()
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
    var required_errors = exports.checkRequired(this.fields, doc, []);
    var validation_errors = exports.validateFields(
        this.fields, doc, doc, [], this.allow_extra_fields
    );
    return required_errors.concat(validation_errors);
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
            if (f instanceof Field) {
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
                    var err = new Error(
                        'Field "' + path.concat([k]).join('.') + '" not defined'
                    );
                    err.field = path.concat([k]);
                    errors.push(err);
                }
            }
            else if (f instanceof Field) {
                // its a field, validate it
                try {
                    f.validate(doc, values[k], values[k]);
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
