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
            return exports.validateFields(
                types[k].fields, doc, doc, [], types[k].allow_extra_fields
            );
        }
    }
    return; // unknown document type
};


/**
 * Validates an object containing fields against some values, recursing over
 * sub-objects and checking for extra fields. When a field and matching value
 * are detected the field's validate function is run.
 *
 * @param {Object} fields
 * @param {Object} values
 * @param {Object} doc
 * @param {Array} path
 * @param {Boolean} allow_extra
 * @return {Array}
 * @api public
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
                    errors.push(new Error(
                        'Field "' + path.concat(k).join('.') + '" not defined'
                    ));
                }
            }
            else if (f instanceof Field) {
                // its a field, validate it
                try {
                    f.validate(doc, values[k], values[k]);
                }
                catch (e) {
                    errors.push(e);
                }
            }
            else if (utils.isArray(f)) {
                if ((f.length === 0 || !f[0]) && values[k].length > 0) {
                    if (!allow_extra) {
                        errors.push(new Error(
                            'Field "' + path.concat(k).join('.') +
                            '" should be empty'
                        ));
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
                                errors.push(e2);
                            }
                        }
                        else {
                            // recurse through sub-objects
                            errors = errors.concat(exports.validateFields(
                                f[0], v, doc, path.concat(k), allow_extra
                            ));
                        }
                    }
                }
            }
            else {
                // recurse through sub-objects in the type's schema to find
                // more fields
                errors = errors.concat(exports.validateFields(
                    fields[k], values[k], doc, path.concat(k), allow_extra
                ));
            }
        }
    }
    return errors;
};
