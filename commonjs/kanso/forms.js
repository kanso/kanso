/**
 * Module dependencies
 */

var utils = require('./utils'),
    fieldset = require('./fieldset'),
    _ = require('./underscore')._;


/**
 * Form object, presents fields and parses responses.
 *
 * @param {Object} fields
 * @constructor
 * @api public
 */

var Form = exports.Form = function Form(fields) {
    this.fields = fields;
};

/**
 * Parses a request and validates the result, binding values and errors to
 * the form instance.
 *
 * @param {Object} req
 * @return {Form}
 * @api public
 */

Form.prototype.validate = function (req) {
    this.raw = req.form || {};
    this.values = exports.parseRaw(this.fields, this.raw);
    this.errors = fieldset.validate(
        this.fields, this.values, this.values, this.raw, [], false
    );
    return this;
};

/**
 * After a form has called validate, this function will return true if the form
 * is valid, false otherwise.
 *
 * @return {Boolean}
 * @api public
 */

Form.prototype.isValid = function () {
    return !(this.errors && this.errors.length);
};

/**
 * Converts current form to a HTML string, using an optional renderer class.
 *
 * @param {Object} req
 * @param {Renderer} rendererClass
 * @return {String}
 * @api public
 */

Form.prototype.toHTML = function (req, rendererClass) {
    var values = this.values || fieldset.createDefaults(
        this.fields,
        req.userCtx
    );
    var renderer = new rendererClass();
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
 * @return {Array}
 * @api public
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
 * TODO: this method is fugly, refactor!
 *
 * @param {Object} renderer
 * @param {Object} fields
 * @param {Object} values
 * @param {Array} errs
 * @param {Array} path
 * @return {String}
 * @api public
 */

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
        if (cname === 'Field') {
            return html + renderer.field(
                fields[k],
                f_path.join('.'),
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs
            );
        }
        else if (cname === 'Embedded') {
            var new_renderer = renderer.embed(
                fields[k].type,
                f_path.join('.'),
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs
            );
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
            return html;
        }
        else if (cname === 'EmbeddedList') {
            var type = fields[k].type;
            var new_renderer = renderer.embedList(
                type,
                f_path.join('.'),
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs
            );
            html += new_renderer.start();
            html += _.reduce(values[k], function (html, v, i) {
                var f_path2 = f_path.concat([i]);
                var f_errs2 = errsBelowPath(f_errs, f_path2);
                var v_renderer = new_renderer.each(
                    type,
                    f_path2.join('.'),
                    v,
                    (raw[k][i] === undefined) ? v[i]: raw[k][i],
                    f_errs2
                );
                html += v_renderer.start();
                html += that.renderFields(
                    v_renderer,
                    type.fields,
                    v,
                    (raw[k][i] === undefined) ? v[i]: raw[k][i],
                    f_errs2,
                    f_path2
                );
                html += v_renderer.end();
                return html;
            }, '');
            html += new_renderer.end();
            return html;
        }
        else {
            return html + that.renderFields(
                renderer,
                fields[k],
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                errs,
                f_path
            );
        }
    }, '');
};


/**
 * Transforms a flat object from a request query to a proper
 * hierarchy of properties.
 *
 * {'one.two': 'val'} --> {one: {two: 'val'}}
 *
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
 * @param {Type} type
 * @param {Object} raw
 * @return {Object}
 * @api public
 */

exports.parseRaw = function (fields, raw) {
    var doc = {};
    for (var k in fields) {
        var f = fields[k];
        var cname = utils.constructorName(f);
        if (cname === 'Field' ||
            cname === 'Embedded' ||
            cname === 'EmbeddedList') {

            if (!f.isEmpty(raw[k]) || !f.omit_empty) {
                doc[k] = f.parse(raw[k]);
            }
        }
        else {
            doc[k] = exports.parseRaw(f, raw[k]);
        }
    }
    return doc;
};
