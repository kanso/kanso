/**
 * Fields
 * ======
 *
 * The building blocks of Types and Forms, Fields help to validate and authorize
 * changes to docuemnt values.
 *
 */


/**
 * Module dependencies
 */

var permissions = require('./permissions'),
    validators = require('./validators'),
    widgets = require('./widgets'),
    utils = require('./utils'),
    _ = require('./underscore')._;


/**
 * Field objects are used when constructing content types and forms.
 *
 * Options:
 *   omit_empty  {Boolean} - whether to omit the field from a document when
 *                           the field is empty
 *   permissions {Object}  - a permissions check function or an object
 *                           containing separate functions to run on create,
 *                           edit and update operations.
 *   validators  {Array}   - an array of validation functions (default: [])
 *   required    {Boolean} - whether the field is required (default: true)
 *
 * @constructor
 * @param {Object} options
 * @api public
 */

var Field = exports.Field = function Field(options) {
    _.extend(this, _.defaults(options || {}, {
        widget: widgets.text(),
        omit_empty: false,
        permissions: {},
        validators: [],
        required: true
    }));
};


/**
 * Parses a raw value returning the correct JavaScript type for this field.
 * This will usually be overridden by other field types.
 *
 * @param raw
 * @api public
 */

Field.prototype.parse = function (raw) {
    return raw;
};


/**
 * Test values to see if field is considered empty.
 *
 * This function accepts the raw value even though by default it only
 * checks the parsed value, so that other field types overridding this method
 * have the raw data available.
 *
 * @param value - the parsed value for the field
 * @param raw - the raw value for this field
 * @returns {Boolean}
 * @api public
 */

Field.prototype.isEmpty = function (value, raw) {
    if (raw === undefined) {
        raw = value;
    }
    return (raw === '' || raw === null || raw === undefined);
};

/**
 * Run the field's validation functions against a value. Returns an
 * array of validation errors, or an empty array if valid.
 *
 * @param {Object} doc
 * @param value
 * @param raw
 * @return {Array}
 * @api public
 */

Field.prototype.validate = function (doc, value, raw) {
    // don't validate empty fields, but check if required
    if (this.isEmpty(value, raw)) {
        if (this.required) {
            return [new Error('Required field')];
        }
        return [];
    }
    return _.reduce(this.validators, function (errs, v) {
        try {
            errs = errs.concat(v(doc, value, raw) || []);
        }
        catch (e) {
            errs.push(e);
        }
        return errs;
    }, []);
};

/**
 * Check relevant field permissions to see if user is authorised to make
 * changes. Returns an array of permissions errors, or an empty array if the
 * changes are permissible.
 *
 * @param {Object} newDoc
 * @param {Object} oldDoc
 * @param newVal
 * @param oldVal
 * @param {Object} userCtx
 * @return {Array}
 * @api public
 */

Field.prototype.authorize = function (newDoc, oldDoc, newVal, oldVal, userCtx) {
    var perms = this.permissions;
    var errors = [];
    if (_.isFunction(perms)) {
        errors = errors.concat(
            utils.getErrors(perms, arguments)
        );
    }
    // on update
    var fn = perms.update;
    // on add
    if (newDoc && !oldDoc) {
        fn = perms.add;
    }
    // on remove
    else if (newDoc._deleted) {
        fn = perms.remove;
    }
    if (fn) {
        errors = errors.concat(
            utils.getErrors(fn, arguments)
        );
    }
    return errors;
};


/**
 * Embedded objects represent a Type embedded within another Type or set of
 * Fields. Its not a true field, but like the Field constructor it acts as a
 * marker when walking through the sub-objects that make up a schema.
 *
 * Exposes the same methods as Field objects.
 *
 * Options:
 *   type        {Type Object}  - Required, the Type definition to embed
 *   omit_empty  {Boolean} - whether to omit the field from a document when
 *                           the field is empty
 *   permissions {Object}  - a permissions check function or an object
 *                           containing separate functions to run on create,
 *                           edit and update operations.
 *   validators  {Array}   - an array of validation functions (default: [])
 *   required    {Boolean} - whether the field is required (default: true)
 *
 * @param {Object} options
 * @constructor
 * @api public
 */

var Embedded = exports.Embedded = function Embedded(options) {
    options = options || {};
    var type = options.type;
    if (!type) {
        throw new Error('No type specified');
    }
    options.permissions = _.defaults((options.permissions || {}), {
        add: permissions.inherit(type),
        remove: permissions.inherit(type),
        update:   permissions.inherit(type)
    });
    _.extend(this, _.defaults(options, {
        required: true
    }));
    this.type = type;
};

/**
 * Test values to see if field is considered empty.
 *
 * This function accepts the raw value even though by default it only
 * checks the parsed value, so that other field types overridding this method
 * have the raw data available.
 *
 * @param value - the parsed value for the field
 * @param raw - the raw value for this field
 * @api public
 */

Embedded.prototype.isEmpty = function (value, raw) {
    return (value === '' || value === null || value === undefined);
};

/**
 * Run the type's validate function against a value. Returns an
 * array of validation errors, or an empty array if valid.
 *
 * @param {Object} doc
 * @param value
 * @param raw
 * @return {Array}
 * @api public
 */

Embedded.prototype.validate = function (doc, value, raw) {
    // don't validate empty fields, but check if required
    if (this.isEmpty(value, raw)) {
        if (this.required) {
            return [new Error('Required field')];
        }
        return [];
    }
    if (!value._id) {
        return [new Error('Embedded document missing _id')];
    }
    return this.type.validate(value, raw);
};

/**
 * Check relevant type permissions to see if user is authorised to make
 * changes. Returns an array of permissions errors, or an empty array if the
 * changes are permissible.
 *
 * @param {Object} newDoc
 * @param {Object} oldDoc
 * @param newVal
 * @param oldVal
 * @param {Object} user
 * @return {Array}
 * @api public
 */

Embedded.prototype.authorize = function (newDoc, oldDoc, newVal, oldVal, user) {
    return this.type.authorize(newVal || {_deleted: true}, oldVal, user);
};

/**
 * EmbeddedList objects represent multiple instances of a Type embedded within
 * another Type or set of Fields. Its not a true field, but like the Field
 * constructor it acts as a marker when walking through the sub-objects that
 * make up a schema.
 *
 * Exposes the same methods as Field objects.
 *
 * Options:
 *   type        {Type Object}  - Required, the Type definition to embed
 *   omit_empty  {Boolean} - whether to omit the field from a document when
 *                           the field is empty
 *   permissions {Object}  - a permissions check function or an object
 *                           containing separate functions to run on create,
 *                           edit and update operations.
 *   validators  {Array}   - an array of validation functions (default: [])
 *   required    {Boolean} - whether the field is required (default: true)
 *
 * @param {Object} options
 * @constructor
 * @api public
 */

var EmbeddedList = exports.EmbeddedList = function EmbeddedList(options) {
    options = options || {};
    var type = options.type;
    if (!type) {
        throw new Error('No type specified');
    }
    options.permissions = _.defaults((options.permissions || {}), {
        add: permissions.inherit(type),
        remove: permissions.inherit(type),
        update:   permissions.inherit(type)
    });
    _.extend(this, _.defaults(options, {
        required: true
    }));
    this.type = type;
};

/**
 * Test values to see if field is considered empty.
 *
 * This function accepts the raw value even though by default it only
 * checks the parsed value, so that other field types overridding this method
 * have the raw data available.
 *
 * @param value - the parsed value for the field
 * @param raw - the raw value for this field
 * @api public
 */

EmbeddedList.prototype.isEmpty = function (value, raw) {
    return (value === '' || value === null || value === undefined);
};

/**
 * Detects embedded documents with missing _id properties and returns an
 * array of Error objects for each occurence. Returns an empty array if
 * all documents have a populated _id property.
 *
 * @param {Array} list
 * @return {Array}
 * @api public
 */

EmbeddedList.prototype.missingIDs = function (list) {
    var errs = []
    _.each(list, function (v, i) {
        if (!v._id) {
            var e = new Error('Embedded document missing _id');
            e.field = [i];
            errs.push(e);
        }
    });
    return errs;
};

/**
 * Detects embedded documents with duplicate _id properties and returns an
 * array of Error objects for each occurence. Returns an empty array if
 * all documents have a unique _id property.
 *
 * @param {Array} list
 * @return {Array}
 * @api public
 */

EmbeddedList.prototype.duplicateIDs = function (list) {
    var ids = {};
    var errs = [];
    _.each(list, function (v, i) {
        if (v._id in ids) {
            var e = new Error('Embedded document duplicates an existing _id');
            e.field = [i];
            errs.push(e);
        }
        ids[v._id] = true;
    });
    return errs;
};

/**
 * Checks for missing or duplicate _ids then runs the type's validate function
 * against each embedded document. Returns an array of validation errors, or
 * an empty array if valid.
 *
 * @param {Object} doc
 * @param value
 * @param raw
 * @return {Array}
 * @api public
 */

EmbeddedList.prototype.validate = function (doc, value, raw) {
    var type = this.type;

    // don't validate empty fields, but check if required
    if (this.isEmpty(value, raw)) {
        if (this.required) {
            return [new Error('Required field')];
        }
        return [];
    }

    // check for missing ids
    var missing = this.missingIDs(value);
    if (missing.length) {
        return missing;
    }

    // check for duplicate ids
    var duplicates = this.duplicateIDs(value);
    if (duplicates.length) {
        return duplicates;
    }

    // run type validation against each embedded document
    return _.reduce(value, function (errs, v, i) {
        var r = raw ? raw[i]: undefined;
        return errs.concat(
            _.map(type.validate(v, r), function (err) {
                err.field = [i].concat(err.field || []);
                return err;
            })
        );
    }, []);
};

/**
 * Check relevant type permissions to see if user is authorised to make
 * changes. Returns an array of permissions errors, or an empty array if the
 * changes are permissible.
 *
 * @param {Object} nDoc
 * @param {Object} oDoc
 * @param nVal
 * @param oVal
 * @param {Object} user
 * @return {Array}
 * @api public
 */

EmbeddedList.prototype.authorize = function (nDoc, oDoc, nVal, oVal, user) {
    var type = this.type;
    var perms = this.permissions;

    nVal = nVal || [];
    oVal = oVal || [];
    var maxlen = Math.max(nVal.length, oVal.length);
    return _.reduce(_.range(maxlen), function (errs, i) {

        var curr_errs = [];
        var nd = nVal[i] || {_deleted: true};
        var od = oVal[i];
        var args = [nDoc, oDoc, nd, od, user];

        if (_.isFunction(perms)) {
            curr_errs = utils.getErrors(perms, args)
        }
        // on update
        var fn = perms.update;
        // on add
        if (nd && !od) {
            fn = perms.add;
        }
        // on remove
        else if (nd._deleted) {
            fn = perms.remove;
        }
        if (fn) {
            curr_errs = curr_errs.concat(utils.getErrors(fn, args));
        }
        curr_errs = _.map(curr_errs, function (e) {
            e.field = [i].concat(e.field || []);
            return e;
        });
        return errs.concat(curr_errs);

    }, []);
};


/**
 * Prepends a validator to an array of validator functions.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @api private
 */

var prependValidator = function (options, fn) {
    options = options || {};
    options.validators = [fn].concat(options.validators || []);
    return options;
};


/**
 * Creates a new string Field
 *
 * @param {Object} options
 * @api public
 */

exports.string = function (options) {
    return new Field(_.defaults((options || {}), {
        parse: function (raw) {
            return '' + raw;
        }
    }));
};


/**
 * Creates a new number Field
 *
 * @param {Object} options
 * @api public
 */

exports.number = function (options) {
    options = prependValidator(options, function (doc, value) {
        if (isNaN(value)) {
            throw new Error('Not a number');
        }
    });
    return new Field(_.defaults((options || {}), {
        parse: function (raw) {
            if (raw === null || raw === '') {
                return NaN;
            }
            return Number(raw);
        }
    }));
};


/**
 * Creates a new boolean Field
 *
 * @param {Object} options
 * @api public
 */

exports.boolean = function (options) {
    return new Field(_.defaults((options || {}), {
        widget: widgets.checkbox(),
        required: false,
        parse: Boolean
    }));
};


/**
 * Creates a URL Field
 *
 * @param {Object} options
 * @api public
 */

exports.url = function (options) {
    options = prependValidator(options, validators.url());
    return exports.string(options);
};


/**
 * Creates an email Field
 *
 * @param {Object} options
 * @api public
 */

exports.email = function (options) {
    options = prependValidator(options, validators.email());
    return exports.string(options);
};


/**
 * Creates a creator Field
 *
 * @param {Object} options
 * @api public
 */

exports.creator = function (options) {
    options = options || {};
    if (!options.permissions) {
        options.permissions = {};
    }
    var p = options.permissions;
    if (p.add) {
        p.add = permissions.all([
            permissions.matchUsername(),
            p.add
        ]);
    }
    else {
        p.add = permissions.matchUsername();
    }
    if (p.update) {
        p.update = permissions.all([
            permissions.fieldUneditable(),
            p.update
        ]);
    }
    else {
        p.update = permissions.fieldUneditable();
    }
    return exports.string(_.defaults(options, {
        required: false,
        widget: widgets.hidden(),
        default_value: function (req) {
            return (req.userCtx && req.userCtx.name) || '';
        }
    }));
};


/**
 * Creates a timestamp Field
 *
 * @param {Object} options
 * @api public
 */

exports.timestamp = function (options) {
    options = options || {};
    if (!options.permissions) {
        options.permissions = {};
    }
    var p = options.permissions;
    if (p.update) {
        p.update = permissions.all([
            permissions.fieldUneditable(),
            p.update
        ]);
    }
    else {
        p.update = permissions.fieldUneditable();
    }
    return exports.number(_.defaults(options, {
        widget: widgets.hidden(),
        default_value: function (req) {
            return new Date().getTime();
        }
    }));
};


/**
 * Creates a choice Field
 *
 * Required option: values - an array of possible choices, each an array
 * with the first item as the value and the second as its label.
 *
 * @param {Object} options
 * @api public
 */

exports.choice = function (options) {
    if (!options || !options.values) {
        throw new Error('No values defined')
    }
    options = prependValidator(options, function (doc, value) {
        for (var i = 0; i < options.values.length; i++) {
            if (value === options.values[i][0]) {
                return;
            }
        }
        throw new Error('Invalid choice');
    });
    // use value as label if no label defined
    options.values = _.map(options.values, function (v) {
        return _.isArray(v) ? v: [v,v];
    });
    return new Field(_.defaults(options, {
        widget: widgets.select({values: options.values})
    }));
};


/**
 * Creates a number choice Field
 *
 * @param {Object} options
 * @api public
 */

exports.numberChoice = function (options) {
    options = options || {};
    prependValidator(options, function (doc, value) {
        if (isNaN(value)) {
            throw new Error('Not a number');
        }
    });
    return exports.choice(_.defaults(options, {
        parse: function (raw) {
            if (raw === null || raw === '') {
                return '';
            }
            return Number(raw);
        }
    }));
};


/**
 * Creates an Embedded Field
 *
 * Required option: type - the Type definition to embed
 *
 * @param {Object} options
 * @api public
 */

exports.embed = function (options) {
    return new Embedded(options);
};


/**
 * Creates an EmbeddedList Field
 *
 * Required option: type - the Type definition to embed
 *
 * @param {Object} options
 * @api public
 */

exports.embedList = function (options) {
    return new EmbeddedList(options);
};
