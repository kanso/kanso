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
    db = require('./db'),
    fields = require('./fields'),
    fieldset = require('./fieldset'),
    widgets = require('./widgets'),
    permissions = require('./permissions'),
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

var Type = exports.Type = function Type(name, options) {
    if (typeof name !== 'string') {
        throw new Error('First argument must be the type name');
    }
    this.name = name;
    options = options || {};

    var f = {};
    f._id = fields.string({
        omit_empty: true,
        required: false,
        widget: widgets.hidden(),
        permissions: {
            update: permissions.fieldUneditable()
        }
    });
    f._rev = fields.string({
        omit_empty: true,
        required: false,
        widget: widgets.hidden()
    });
    f._deleted = fields.boolean({
        omit_empty: true,
        required: false,
        widget: widgets.hidden()
    });
    f.type = fields.string({
        default_value: name,
        widget: widgets.hidden(),
        permissions: {
            add: function (newDoc, oldDoc, newVal, oldVal, userCtx) {
                if (newVal !== name) {
                    throw new Error('Unexpected value for type');
                }
            },
            update: permissions.fieldUneditable()
        }
    });
    for (var k in options.fields) {
        if (options.fields.hasOwnProperty(k)) {
            f[k] = options.fields[k];
        }
    }
    options.fields = f;
    _.extend(this, _.defaults(options, {
        permissions: []
    }));

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
    return fieldset.validate(
        this.fields,
        doc,
        doc,
        rawDoc,
        [],
        this.allow_extra_fields
    );
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
    // on update
    var fn = perms.update;
    // on add
    if (nDoc && !oDoc) {
        fn = perms.add;
    }
    // on remove
    else if (!nDoc || nDoc._deleted) {
        fn = perms.remove;
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

/**
 * Create's a new object for this Type. Pre-filling any default values and
 * providing a new _id value. This is a convenient funciton to use when creating
 * a type to embed within another.
 *
 * @param {Object} userCtx
 * @param {Function} callback
 */

Type.prototype.create = function (userCtx, callback) {
    var doc = fieldset.createDefaults(this.fields, userCtx);
    db.newUUID(100, function (err, uuid) {
        if (err) {
            return callback(err);
        }
        doc._id = uuid;
        callback(null, doc);
    });
};

/**
 * Calls validation and permissions functions relevant to a document update.
 * This should be called from your app's exported validate_doc_update function
 * if you wish to use kanso Types in you project.
 *
 * Throws on error.
 *
 * @param {Object} types
 * @param {Object} newDoc
 * @param {Object} oldDoc
 * @param {Object} userCtx
 */

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
