/**
 * Functions for dealing with collections of fields. Used by both the
 * types and forms modules.
 *
 * @module
 */

/**
 * Module dependencies
 */

var _ = require('./underscore'),
    utils = require('./utils'),
    core = require('./core');


/**
 * Returns a hierachy of default values for a given set of Field objects
 *
 * @name createDefaults(fields, userCtx)
 * @param {Object} fields
 * @returns {Object}
 * @api public
 */

exports.createDefaults = function (fields, /*optional*/userCtx) {
    if (!userCtx) {
        userCtx = core.currentRequest().userCtx;
    }
    return _.reduce(_.keys(fields), function (result, k) {
        var f = fields[k];
        var cname = utils.constructorName(f);
        if (cname === 'Field' ||
            cname === 'Embedded' ||
            cname === 'EmbeddedList') {
            if (f.hasOwnProperty('default_value')) {
                if (_.isFunction(f.default_value)) {
                    result[k] = f.default_value(userCtx);
                }
                else {
                    result[k] = f.default_value;
                }
            }
        }
        else if (cname === 'Object') {
            result[k] = exports.createDefaults(f, userCtx);
        } else {
            throw new Error('The field type `' + cname + '` is not supported.');
        }
        return result;
    }, {});
};

/**
 * Validate a specific field, returning all validation errors as an array with
 * each error's field property prefixed by the current path.
 *
 * @name validateField(field, doc, value, raw, path)
 * @param {Field} field
 * @param {Object} doc
 * @param value
 * @param raw
 * @param {Array} path
 * @returns {Array}
 * @api public
 */

exports.validateField = function (field, doc, value, raw, path) {
    //log('validateField: ' + path.join('.'));
    return _.map(field.validate(doc, value, raw), function (err) {
        err.field = path.concat(err.field || []);
        err.has_field = true;
        return err;
    });
};

/**
 * Validates an object containing fields or other sub-objects, iterating over
 * each property and recursing through sub-objects to find all Fields.
 *
 * Returns an array of validation errors, each with a field property set to the
 * path of the field which caused the error.
 *
 * @name validate(fields, doc, values, raw, path, extra)
 * @param {Object} fields
 * @param {Object} doc
 * @param {Object} values
 * @param {Object} raw
 * @param {Array} path
 * @param {Boolean} extra - whether to allow extra values not covered by a field
 * @returns {Array}
 * @api public
 */

exports.validate = function (fields, doc, values, raw, path, extra) {
    //log('validateFieldSet: ' + path.join('.'));
    values = values || {};
    fields = fields || {};
    raw = raw || {};

    // Expecting sub-object, not a value
    if (typeof values !== 'object') {
        var e = new Error('Unexpected property');
        e.field = path;
        e.has_field = false;
        return [e];
    }

    // Ensure we walk through all paths of both fields and values by combining
    // the keys of both. Otherwise, we might miss out checking for missing
    // required fields, or may not detect the presence of extra fields.

    var keys = _.uniq(_.keys(fields).concat(_.keys(values)));

    return _.reduce(keys, function (errs, k) {
        var f = fields[k];
        if (f === undefined) {
            // Extra value with no associated field detected
            if (!extra) {
                // ignore system properties
                if (path.length !== 0 || k.charAt(0) !== '_') {
                    var e = new Error('Unexpected property');
                    e.field = path.concat([k]);
                    e.has_field = false;
                    errs.push(e);
                }
            }
            return errs;
        }
        var fn = exports.validate;
        var cname = utils.constructorName(f);
        if (cname === 'Field' ||
            cname === 'Embedded' ||
            cname === 'EmbeddedList') {
            fn = exports.validateField;
        }
        return errs.concat(
            fn.call(this, f, doc, values[k], raw[k], path.concat([k]), extra)
        );
    }, []);
};
