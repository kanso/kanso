/**
 * Types
 * =====
 *
 * Document types can be used to ease the validation of updates and check
 * permissions when creating, editing or deleting documents.
 *
 */


/**
 * Module dependencies
 */

var utils = require('./utils'),
    fields = require('./fields'),
    _ = require('./underscore')._;


/**
 * Creates a new Type object
 *
 * Options:
 *   fields      {Object}  - Field objects to use as the Types's schema
 *   permissions {Object}  - a permissions check function or an object
 *                           containing separate functions to run on create,
 *                           edit and update operations.
 *
 * @param {Object} options
 * @constructor
 * @api public
 */

var Type = exports.Type = function Type(options) {
    _.extend(this, _.defaults(options || {}, {
        fields: {},
        permissions: []
    }));
    this.fields._id = new fields.Field({
        omit_empty: true,
        required: false
    });
    this.fields._rev = new fields.Field({
        omit_empty: true,
        required: false
    });
    this.fields._deleted = new fields.Field({
        omit_empty: true,
        required: false
    });
};

/**
 * Run field validators against document and check for missing required
 * fields or extra fields when the Types's allow_extra_fields property is
 * set to false.
 *
 * @param {Object} doc
 * @param {Object} rawDoc
 * @return {Array}
 * @api public
 */

Type.prototype.validate = function (doc, rawDoc) {
    rawDoc = rawDoc || doc;
    return this.validateFieldSet(this.fields, doc, doc, rawDoc, []);
};

/**
 * Validate a specific field, returning all validation errors as an array with
 * each error's field property prefixed by the current path.
 *
 * @param {Field} field
 * @param {Object} doc
 * @param value
 * @param raw
 * @param {Array} path
 * @return {Array}
 * @api public
 */

Type.prototype.validateField = function (field, doc, value, raw, path) {
    //console.log('validateField: ' + path.join('.'));
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
 * @param {Object} fields
 * @param {Object} doc
 * @param {Object} values
 * @param {Object} raw
 * @param {Array} path
 * @return {Array}
 * @api public
 */

Type.prototype.validateFieldSet = function (fields, doc, values, raw, path) {
    //console.log('validateFieldSet: ' + path.join('.'));
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
    var that = this;

    return _.reduce(keys, function (errs, k) {
        var f = fields[k];
        if (f === undefined) {
            // Extra value with no associated field detected
            if (!that.allow_extra_fields) {
                var e = new Error('Unexpected property');
                e.field = path.concat([k]);
                e.has_field = false;
                errs.push(e);
            }
            return errs;
        }
        var fn = that.validateFieldSet;
        var cname = utils.constructorName(f);
        if (cname === 'Field' ||
            cname === 'Embedded' ||
            cname === 'EmbeddedList') {
            fn = that.validateField;
        }
        return errs.concat(
            fn.call(that, f, doc, values[k], raw[k], path.concat([k]))
        );
    }, []);
};

/**
 * Run field permissions checks against userCtx and document.
 *
 * @param {Object} nDoc - new document
 * @param {Object} oDoc - old document
 * @param {Object} userCtx - user context object
 * @return {Array}
 * @api public
 */

Type.prototype.authorize = function (nDoc, oDoc, user) {
    var perms = this.permissions;
    var errs = []
    if (_.isFunction(perms)) {
        errs = errs.concat(
            utils.getErrors(perms, [nDoc, oDoc, null, null, user])
        );
    }
    // on edit
    var fn = perms.edit;
    // on create
    if (nDoc && !oDoc) {
        fn = perms.create;
    }
    // on delete
    else if (!nDoc || nDoc._deleted) {
        fn = perms.delete;
    }
    if (fn) {
        errs = errs.concat(
            utils.getErrors(fn, [nDoc, oDoc, null, null, user])
        );
    }
    return errs.concat(
        this.authFieldSet(this.fields, nDoc, oDoc, nDoc, oDoc, user, [])
    );
};

/**
 * Authorize a specific field, returning all permissions errors as an array with
 * each error's field property prefixed by the current path.
 *
 * @param {Field} f     - field object
 * @param {Object} nDoc - new document
 * @param {Object} oDoc - old document
 * @param nVal          - new field value
 * @param oVal          - old field value
 * @param {Object} user - user context object
 * @param {Array} path  - current path
 * @return {Array}
 * @api public
 */

Type.prototype.authField = function (f, nDoc, oDoc, nVal, oVal, user, path) {
    //console.log('authField: ' + path.join('.'));
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
 * @param {Field} f     - field object
 * @param {Object} nDoc - new document
 * @param {Object} oDoc - old document
 * @param nVal          - new field value
 * @param oVal          - old field value
 * @param {Object} user - user context object
 * @param {Array} path  - current path
 * @return {Array}
 * @api public
 */

Type.prototype.authFieldSet = function (f, nDoc, oDoc, nVal, oVal, user, path) {
    //console.log('authFieldSet: ' + path.join('.'));
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

    var that = this;

    return _.reduce(keys, function (errs, k) {
        var field = f[k];
        if (field === undefined) {
            // Extra value with no associated field detected
            // This *should* be picked up by validation, and be raised as a
            // validation error before it gets to the auth stage
            if (!that.allow_extra_fields) {
                var e = new Error('Unexpected property');
                e.field = path.concat([k]);
                e.has_field = false;
                errs.push(e);
            }
            return errs;
        }
        var fn = that.authFieldSet;
        var cname = utils.constructorName(field);
        if (cname === 'Field' ||
            cname === 'Embedded' ||
            cname === 'EmbeddedList') {
            fn = that.authField;
        }
        return errs.concat(fn.call(
            that, field, nDoc, oDoc, nVal[k], oVal[k], user, path.concat([k])
        ));
    }, []);
};
