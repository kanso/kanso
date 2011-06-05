/**
 * Functions for the rendering, parsing and validation of forms.
 *
 * @module
 */

/**
 * Module dependencies
 */

var utils = require('./utils'),
    fieldset = require('./fieldset'),
    render = require('./render'),
    _ = require('./underscore')._;


/**
 * Form object, presents fields and parses responses.
 *
 * @name Form(fields | type, [doc])
 * @param {Object} fields
 * @param {Object} doc (optional)
 * @param {Object} options
 * @constructor
 * @api public
 */

var Form = exports.Form = function Form(fields, doc, options) {

    this.fields = (fields && fields.fields) ? fields.fields: fields;

    if (options) {
        if (options.exclude) {
            for (k in this.fields) {
                if (_.contains(options.exclude, k)) {
                    delete this.fields[k];
                }
            }
        }
        if (options.fields) {
            for (k in this.fields) {
                if (!_.contains(options.fields, k)) {
                    delete this.fields[k];
                }
            }
        }
    }

    /*
    if (utils.constructorName(fields) === 'Type') {
        this.type = fields;
        this.fields = fields.field;
    }
    else {
        this.fields = fields;
    }
    */
    if (doc) {
        this.values = doc;
    }
};

/**
 * Parses a request and validates the result, binding values and errors to
 * the form instance.
 *
 * @name Form.validate(req)
 * @param {Object} req
 * @returns {Form}
 * @api public
 */

Form.prototype.validate = function (req) {
    // TODO: change this to accept an object instead of a request?
    // doing req.form isn't that difficult and would make more sense
    this.raw = req.form || {};
    var tree = exports.formValuesToTree(this.raw);
    this.values = exports.parseRaw(this.fields, tree);
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
 * @param {Object} req
 * @param {Renderer} RendererClass (optional)
 * @returns {String}
 * @api public
 */

Form.prototype.toHTML = function (req, /*optional*/RendererClass) {
    if (!req) {
        throw new Error(
            'Form\'s toHTML method requires request object as first argument'
        );
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

// TODO: this method is fugly, refactor!
Form.prototype.renderFields = function (renderer, fields, values, raw, errs, path) {
    fields = fields || {};
    values = values || {};
    raw = raw || {};
    errs = errs || [];
    path = path || [];
    var that = this;

    var keys = _.keys(fields);
    return _.reduce(keys, function (html, k) {

        var f_path = path.concat([k]);
        var f_errs = errsBelowPath(errs, f_path);
        var cname = utils.constructorName(fields[k]);
        var new_renderer;

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
            new_renderer = renderer.embed(
                fields[k].type,
                f_path,
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs
            );
            if (typeof new_renderer === 'string') {
                html += new_renderer;
            }
            else {
                html += new_renderer.start();
                html += that.renderFields(
                    new_renderer,
                    fields[k].type.fields,
                    values[k],
                    (raw[k] === undefined) ? values[k]: raw[k],
                    f_errs,
                    f_path
                );
                html += new_renderer.end();
            }
            return html;
        }
        else if (cname === 'EmbeddedList') {
            var type = fields[k].type;
            new_renderer = renderer.embedList(
                type,
                f_path,
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs
            );
            if (typeof new_renderer === 'string') {
                html += new_renderer;
            }
            else {
                html += new_renderer.start();
                if (new_renderer.each) {
                    html += _.reduce(values[k], function (html, v, i) {
                        var f_path2 = f_path.concat([i]);
                        var f_errs2 = errsBelowPath(f_errs, f_path2);
                        var v_renderer = new_renderer.each(
                            type,
                            f_path2,
                            v,
                            (raw[k] === undefined || raw[k][i] === undefined) ? v[i]: raw[k][i],
                            f_errs2
                        );
                        html += v_renderer.start();
                        html += that.renderFields(
                            v_renderer,
                            type.fields,
                            v,
                            (raw[k] === undefined || raw[k][i] === undefined) ? v[i]: raw[k][i],
                            f_errs2,
                            f_path2
                        );
                        html += v_renderer.end();
                        return html;
                    }, '');
                }
                html += new_renderer.end();
            }
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
            if (!f.isEmpty(r) || !f.omit_empty) {
                doc[k] = f.parse(r);
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
