/**
 * Functions for the rendering, parsing and validation of forms.
 *
 * @module
 */

/**
 * Module dependencies
 */

var core = require('./core'),
    utils = require('./utils'),
    fieldset = require('./fieldset'),
    render = require('./render'),
    _ = require('./underscore')._;


/**
 * Form object, presents fields and parses responses.
 *
 * #### Options ####
 *
 * <table class="options">
 *   <tr>
 *      <td class="name">exclude</td>
 *      <td class="type">Array</td>
 *      <td class="description">a list of field names to exclude</td>
 *   </tr>
 *   <tr>
 *      <td class="name">fields</td>
 *      <td class="type">Array</td>
 *      <td class="description">
 *          a subset of fields to use (inverse of excluded)
 *      </td>
 *   </tr>
 * </table>
 *
 * @name Form(fields | type, [doc])
 * @param {Object} fields  - an object literal containing fields or a Type
 * @param {Object} doc     - (optional) the original document being edited
 * @param {Object} options - (optional) see available options above
 * @constructor
 * @api public
 */

var Form = exports.Form = function Form(fields, doc, options) {
    this.options = options || {};
    this.values = doc;

    this.fields = (fields && fields.fields) ? fields.fields: fields;
    /*
    if (utils.constructorName(fields) === 'Type') {
        this.type = fields;
        this.fields = this.type.field;
    }
    else {
        this.fields = fields;
    }
    */
};

/**
 * Parses a request and validates the result, binding values and errors to
 * the form instance.
 *
 * @name Form.validate(req)
 * @param {Object} form
 * @returns {Form}
 * @api public
 */

Form.prototype.validate = function (/*optional*/form) {
    if (!form) {
        form = core.currentRequest().form;
    }
    this.raw = form || {};
    var tree = exports.formValuesToTree(this.raw);

    this.values = utils.override(
        this.values || fieldset.createDefaults(this.fields, req.userCtx),
        exports.parseRaw(this.fields, tree)
    );
    this.errors = fieldset.validate(
        this.fields, this.values, this.values, this.raw, [], false
    );
    return this;
};

/**
 * After a form has called validate, this function will return true if the form
 * is valid, false otherwise.
 *
 * @name Form.isValid()
 * @returns {Boolean}
 * @api public
 */

Form.prototype.isValid = function () {
    return !(this.errors && this.errors.length);
};

/**
 * Converts current form to a HTML string, using an optional renderer class.
 *
 * @name Form.toHTML(req, [RendererClass])
 * @param {Object} req Kanso request object; null for most recent. (optional)
 * @param {Renderer} RendererClass (optional)
 * @returns {String}
 * @api public
 */

Form.prototype.toHTML = function (/*optional*/req, /*optional*/RendererClass) {
    if (!req) {
        req = core.currentRequest();
    }
    var values = this.values || fieldset.createDefaults(
        this.fields,
        req.userCtx
    );
    RendererClass = RendererClass || render.table;
    var renderer = new RendererClass();
    return renderer.start() +
        this.renderFields(
            renderer, this.fields, values, this.raw, this.errors, []
        ) + renderer.end();
};

/**
 * Filters an array of errors, returning only those below a specific field path
 *
 * @param {Array} errs
 * @param {Array} path
 * @returns {Array}
 */

var errsBelowPath = function (errs, path) {
    return _.filter(errs, function (e) {
        for (var i = 0, len = path.length; i < len; i++) {
            if (path[i] !== e.field[i]) {
                return false;
            }
        }
        return true;
    });
};

/**
 * Iterates over fields and sub-objects calling the correct renderer function on
 * each. Returns a HTML representation of the fields. Used internally by the
 * toHTML method, you should not need to call this function directly.
 *
 * @name Form.renderFields(renderer, fields, values, raw, err, path)
 * @param {Object} renderer
 * @param {Object} fields
 * @param {Object} values
 * @param {Array} errs
 * @param {Array} path
 * @returns {String}
 * @api public
 */

Form.prototype.renderFields = function (renderer, fields, values, raw, errs, path) {
    fields = fields || {};
    values = values || {};
    raw = raw || {};
    errs = errs || [];
    path = path || [];

    var that = this;
    var excludes = this.options.exclude;
    var field_subset = this.options.fields;
    var keys = _.keys(fields);

    return _.reduce(keys, function (html, k) {

        var f_path = path.concat([k]);

        if (excludes) {
            if (_.indexOf(excludes, f_path.join('.')) !== -1) {
                return html;
            }
        }
        if (field_subset) {
            if (_.indexOf(field_subset, f_path.join('.')) === -1) {
                return html;
            }
        }

        var f_errs = errsBelowPath(errs, f_path);
        var cname = utils.constructorName(fields[k]);

        if (cname === 'Field') {
            return html + renderer.field(
                fields[k],
                f_path,
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs
            );
        }
        else if (cname === 'Embedded') {
            html += renderer.embed(
                fields[k],
                f_path,
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs
            );
            return html;
        }
        else if (cname === 'EmbeddedList') {
            html += renderer.embedList(
                fields[k],
                f_path,
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs
            );
            return html;
        }
        else if (cname === 'Object') {
            return html + (k ? renderer.beginGroup(f_path) : '') +
                that.renderFields(
                    renderer,
                    fields[k],
                    values[k],
                    (raw[k] === undefined) ? values[k]: raw[k],
                    errs,
                    f_path
                ) + (k ? renderer.endGroup(f_path) : '');
        } else {
            throw new Error('The field type `' + cname + '` is not supported.');
        }
    }, '');
};


/**
 * Transforms a flat object from a request query to a proper
 * hierarchy of properties.
 *
 * <pre>{'one.two': 'val'} --> {one: {two: 'val'}}</pre>
 *
 * @name formValuesToTree(form)
 * @param {Object} query
 * @api public
 */

exports.formValuesToTree = function (form) {
    var tree = {};
    for (var k in form) {
        utils.setPropertyPath(tree, k.split('.'), form[k]);
    }
    return tree;
};


/**
 * Transforms a raw query object from formValuesToTree to a
 * document which follows the schema for the given type.
 *
 * @name parseRaw(fields, raw)
 * @param {Type} type
 * @param {Object} raw
 * @returns {Object}
 * @api public
 */

exports.parseRaw = function (fields, raw) {
    var doc = {};
    raw = raw || {};

    for (var k in fields) {
        var f = fields[k];
        var r = raw[k];
        var cname = utils.constructorName(f);

        if (cname === 'Field') {
            if (!f.isEmpty(r)) {
                doc[k] = f.parse(r);
            }
            else if (!f.omit_empty) {
                doc[k] = undefined;
            }
        }
        else if (cname === 'Embedded') {
            if (!f.isEmpty(r)) {
                if (typeof r === 'string') {
                    if (r !== '') {
                        doc[k] = JSON.parse(r);
                    }
                }
                else {
                    doc[k] = exports.parseRaw(f.type.fields, r);
                }
            }
        }
        else if (cname === 'EmbeddedList') {
            doc[k] = [];
            for (var i in r) {
                var val;
                if (typeof r[i] === 'string') {
                    if (r[i] !== '') {
                        val = JSON.parse(r[i]);
                    }
                }
                else {
                    val = exports.parseRaw(f.type.fields, r[i]);
                }
                if (!f.isEmpty(val)) {
                    doc[k][i] = val;
                }
            }
            if (!doc[k].length && f.omit_empty) {
                delete doc[k];
            }
        }
        else if (cname === 'Object') {
            doc[k] = exports.parseRaw(f, r);
        } else {
            throw new Error('The field type `' + cname + '` is not supported.');
        }
    }
    return doc;
};

exports.render = require('./render');
