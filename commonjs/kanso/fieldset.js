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
    utils = require('./utils');


/**
 * Returns a hierachy of default values for a given set of Field objects
 *
 * @name createDefaults(fields, userCtx)
 * @param {Object} fields
 * @returns {Object}
 * @api public
 */

exports.createDefaults = function (fields, userCtx) {
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

/**
 * Authorize a specific field, returning all permissions errors as an array with
 * each error's field property prefixed by the current path.
 *
 * @name authField(f, nDoc, oDoc, nVal, oVal, user, path)
 * @param {Field} f     - field object
 * @param {Object} nDoc - new document
 * @param {Object} oDoc - old document
 * @param nVal          - new field value
 * @param oVal          - old field value
 * @param {Object} user - user context object
 * @param {Array} path  - current path
 * @returns {Array}
 * @api public
 */

exports.authField = function (f, nDoc, oDoc, nVal, oVal, user, path) {
    //log('authField: ' + path.join('.'));
    return _.map(f.authorize(nDoc, oDoc, nVal, oVal, user), function (err) {
        err.field = path.concat(err.field || []);
        err.has_field = true;
        return err;
    });
};

/**
 * Authorizes an object containing fields or other sub-objects, iterating over
 * each property and recursing through sub-objects to find all Fields.
 *
 * Returns an array of permissions errors, each with a field property set to the
 * path of the field which caused the error.
 *
 * @name authFieldSet(f, nDoc, oDoc, nVal, oVal, user, path)
 * @param {Field} f     - field object
 * @param {Object} nDoc - new document
 * @param {Object} oDoc - old document
 * @param nVal          - new field value
 * @param oVal          - old field value
 * @param {Object} user - user context object
 * @param {Array} path  - current path
 * @param {Boolean} extra - whether to raise an error on additional fields
 * @returns {Array}
 * @api public
 */

exports.authFieldSet = function (f, nDoc, oDoc, nVal, oVal, user, path, extra) {
    //log('authFieldSet: ' + path.join('.'));
    nVal = nVal || {};
    oVal = oVal || {};
    f = f || {};

    // Expecting sub-object, not a value
    // This *should* be picked up by validation, and be raised as a validation
    // error before it gets to the auth stage
    if (typeof nVal !== 'object') {
        var e = new Error('Unexpected property');
        e.field = path;
        e.has_field = false;
        return [e];
    }

    // Ensure we walk through all paths of both fields and values by combining
    // the keys of both. Otherwise, we might miss out checking for missing
    // required fields, or may not detect the presence of extra fields.

    var fKeys = _.keys(f);
    var newKeys = _.keys(nVal);
    var oldKeys = _.keys(oVal);
    var keys = _.uniq(fKeys.concat(newKeys).concat(oldKeys));

    return _.reduce(keys, function (errs, k) {
        var field = f[k];
        if (field === undefined) {
            // Extra value with no associated field detected
            // This *should* be picked up by validation, and be raised as a
            // validation error before it gets to the auth stage
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
        var fn = exports.authFieldSet;
        var cname = utils.constructorName(field);
        if (cname === 'Field' ||
            cname === 'Embedded' ||
            cname === 'EmbeddedList') {
            fn = exports.authField;
        }
        return errs.concat(fn(
            field, nDoc, oDoc, nVal[k], oVal[k], user, path.concat([k]), extra
        ));
    }, []);
};
