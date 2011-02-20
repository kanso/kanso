/**
 * Module dependencies
 */

var Field = require('./fields').Field,
    utils = require('./utils');


/**
 * Validate a JSON document against the list of types. Unknown document types
 * are ignored, otherwise an array of validation errors is returned. For valid
 * documents the array is empty.
 *
 * @param {Object} types
 * @param {Object} doc
 * @return {Array}
 * @api public
 */

exports.validate = function (types, doc) {
    if (!doc.type) {
        return; // unknown document type
    }
    for (var k in types) {
        if (types.hasOwnProperty(k) && k === doc.type) {
            var type = types[k];
            var fields = types[k].fields;
            var required_errors = exports.checkRequired(fields, doc, []);
            var validation_errors = exports.validateFields(
                fields, doc, doc, [], type.allow_extra_fields
            );
            return required_errors.concat(validation_errors);
        }
    }
    return; // unknown document type
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
            if (f instanceof Field && f.required) {
                console.log('required field: ' + path.join('.'));
                if (!values.hasOwnProperty(k)) {
                    var err = new Error('Required field');
                    err.field = path.concat([k]);
                    errors.push(err);
                }
            }
            else if (utils.isArray(f)) {
                if (f[0] instanceof Field && f.required) {
                    console.log('required field: ' + path.join('.'));
                    if (!values.hasOwnProperty(k)) {
                        var err2 = new Error('Required field');
                        err2.field = path.concat([k]);
                        errors.push(err2);
                    }
                }
                else {
                    // recurse through sub-objects
                    var subvals = values.hasOwnProperty(k) ? values[k]: {};
                    errors = errors.concat(exports.checkRequired(
                        f[0], subvals, path.concat([k])
                    ));
                }
            }
            else {
                // recurse through sub-objects in the type's schema to find
                // more fields
                var subvals2 = values.hasOwnProperty(k) ? values[k]: {};
                errors = errors.concat(exports.checkRequired(
                    f, subvals2, path.concat([k])
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
            if (path.length === 0 && k === 'type') {
                // ignore the type property
            }
            else if (f === undefined) {
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
            else if (utils.isArray(f)) {
                if ((f.length === 0 || !f[0]) && values[k].length > 0) {
                    if (!allow_extra) {
                        var err2 = new Error(
                            'Field "' + path.concat([k]).join('.') +
                            '" should be empty'
                        );
                        err2.field = path.concat([k]);
                        errors.push(err2);
                    }
                }
                else {
                    var v = values[k];
                    for (var i = 0; i < v.length; i += 1) {
                        if (f[0] instanceof Field) {
                            try {
                                f[0].validate(doc, v[i], v[i]);
                            }
                            catch (e2) {
                                e2.field = path.concat([k, i.toString()]);
                                errors.push(e2);
                            }
                        }
                        else {
                            // recurse through sub-objects
                            errors = errors.concat(exports.validateFields(
                                f[0], v, doc, path.concat([k]), allow_extra
                            ));
                        }
                    }
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
