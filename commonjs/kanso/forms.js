var utils = require('./utils');


var Form = exports.Form = function Form(obj, doc) {
    // TODO: when a module cache is implemented in couchdb, we can change this
    // to an instanceof check. until then instanceof checks are to be considered
    // fragile
    if (utils.constructorName(obj) === 'Type') {
        this.fields = obj.fields;
    }
    else {
        this.fields = obj;
    }
    if (doc) {
        this.values = doc;
    }
};

Form.prototype.validate = function (req) {
    this.values = exports.parseRequest(this.fields, req);
    var validation_errors = exports.validateFields(
        this.fields, this.values, this.values, [], false
    );
    var required_errors = exports.checkRequired(this.fields, this.values, []);
    this.errors = required_errors.concat(validation_errors);
    return this;
};

Form.prototype.toHTML = function (req, iterator, prefix) {
    prefix = prefix || '';
    iterator = iterator || exports.render.div;
    return exports.renderFields(
        req, iterator, this.fields, this.values, this.errors, [], prefix
    );
};

Form.prototype.isValid = function () {
    return (!this.errors || this.errors.length === 0);
};

exports.formValuesToTree = function (values) {
    var tree = {};
    for (var k in values) {
        utils.setPropertyPath(tree, k.split('.'), values[k]);
    }
    return tree;
};

exports.parseRequest = function (fields, req) {
    var parsed = {};
    var raw = exports.formValuesToTree(req.form);

    (function parseRaw(fields, parsed, raw, path) {
        for (var k in raw) {
            var f = utils.getPropertyPath(fields, path.concat([k]));
            var cname = utils.constructorName(f);
            var val = raw[k];

            // TODO: when a module cache is implemented in couchdb, we can
            // change this to an instanceof check. until then instanceof
            // checks are to be considered fragile
            if (cname === 'Field') {
                // has a value or omit_empty option is false
                if ((val !== undefined && val !== '') || !f.omit_empty) {
                    var field = f.parse(val);
                    utils.setPropertyPath(parsed, path.concat([k]), field);
                }
            }
            else if (cname === 'Embedded') {
                var subType = {};
                parseRaw(f.type.fields, subType, val, []);
                utils.setPropertyPath(parsed, path.concat([k]), subType);
            }
            else {
                parseRaw(fields, parsed, val, path.concat([k]));
            }
        }
    })(fields, parsed, raw, []);

    return parsed;
};

exports.getErrors = function (errors, path) {
    if (!errors || !errors.length) {
        return [];
    }
    var errs = [];
    var field_name = path.join('.');
    log('looking for errors in ' + field_name);
    for (var i = 0; i < errors.length; i++) {
        if (errors[i].field.join('.') === field_name) {
            errs.push(errors[i]);
        }
    }
    return errs;
};

exports.renderFields = function (req, iterator, fields, values, errors, path, prefix) {
    var html = '';
    for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
            var field = fields[k];
            var field_path = path.concat([k]);
            var errs = exports.getErrors(errors, field_path);
            // TODO: when a module cache is implemented in couchdb, we can
            // change this to an instanceof check. until then instanceof
            // checks are to be considered fragile
            if (utils.constructorName(field) === 'Field') {
                var name = prefix + field_path.join('.');
                var val;
                if (values) {
                    val = utils.getPropertyPath(values, field_path);
                }
                else if (field.default_value) {
                    if (utils.isFunction(field.default_value)) {
                        val = field.default_value(req);
                    }
                    else {
                        val = field.default_value;
                    }
                }
                else {
                    val = undefined;
                }
                html += iterator(name, field, val, errs);
            }
            else if (utils.constructorName(field) === 'Embedded') {
                console.log('render embedded field: ' + field_path.join('.'));
                //var subvalues = utils.getPropertyPath(values, field_path);
                // sub-object, recurse through and check for more fields
                html += exports.renderFields(
                    req, iterator, field.type.fields, values, errors,
                    field_path, prefix
                );
                console.log(html);
                console.log('----');
            }
            else {
                var subvalues = utils.getPropertyPath(values, field_path);
                // sub-object, recurse through and check for more fields
                html += exports.renderFields(
                    req, iterator, field, subvalues, errors, field_path, prefix
                );
            }
        }
    }
    return html;
};


/**
 * iterator functions for use with renderFields
 */

var wrapWith = function (tag) {
    return function (name, field, value, errors) {
        var html = '<' + tag +
            ' class="' + field.classes(errors).join(' ') + '">';

        if (field.widget.type === 'hidden') {
            return field.widget.toHTML(name, value);
        }
        else if (field.widget.type === 'multipleCheckbox' ||
           field.widget.type === 'multipleRadio') {
            html += '<fieldset>' +
                '<legend>' + field.labelText(name) + '</legend>' +
                field.errorHTML() +
                field.widget.toHTML(name, value) +
            '</fieldset>';
        }
        else {
            html += field.errorHTML(errors) +
                field.labelHTML(name) +
                field.widget.toHTML(name, value);
        }
        return html + '</' + tag + '>';
    };
};

exports.render = {
    div: wrapWith('div'),
    p: wrapWith('p'),
    li: wrapWith('li'),
    table: function (name, field, value, errors) {
        // TODO: handle multipleCheckbox and multipleRadio fields
        if (field.widget.type === 'hidden') {
            return field.widget.toHTML(name, value);
        }
        return '<tr class="' + field.classes(errors).join(' ') + '">' +
            '<th>' + field.labelHTML(name) + '</th>' +
            '<td>' +
                field.widget.toHTML(name, value) +
            '</td>' +
            '<td class="errors">' +
                field.errorHTML(errors) +
            '</td>' +
        '</tr>';
    }
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
    log('validateFields');
    log('---');
    log(fields);
    log(values);
    log(doc);
    log(path);
    log(allow_extra);
    log('---');
    var errors = [];

    for (var k in values) {
        if (values.hasOwnProperty(k)) {
            var f = fields[k];
            var val = values[k];
            if (f === undefined) {
                // extra field detected
                if (!allow_extra) {
                    // check for couchdb reserved fields, and let couchdb
                    // handle the validity of those
                    if (!(path.length === 0 && k.substr(1) !== '_')) {
                        var err = new Error(
                            'Field "' + path.concat([k]).join('.') +
                            '" not defined'
                        );
                        err.field = path.concat([k]);
                        errors.push(err);
                    }
                }
            }
            // TODO: when a module cache is implemented in couchdb, we can
            // change this to an instanceof check. until then instanceof
            // checks are to be considered fragile
            else if (utils.constructorName(f) === 'Field') {
                // its a field, validate it
                try {
                    f.validate(doc, f.parse(val), val);
                }
                catch (e) {
                    e.field = path.concat([k]);
                    log('error for field: ' + e.field.join('.'));
                    errors.push(e);
                }
            }
            else if (utils.constructorName(f) === 'Embedded') {
                errors = errors.concat(exports.validateFields(
                    f.type.fields, val, val, path.concat([k]), f.type.allow_extra_fields
                ));
            }
            else {
                // recurse through sub-objects in the type's schema to find
                // more fields
                errors = errors.concat(exports.validateFields(
                    f, val, doc, path.concat([k]), allow_extra
                ));
            }
        }
    }
    log(errors);
    log('------');
    return errors;
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
    log('checkRequired');
    log('---');
    log(fields);
    log(values);
    log(path);
    log('---');
    var errors = [];

    for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
            var f = fields[k];
            var f_path = path.concat([k]);
            // TODO: when a module cache is implemented in couchdb, we can
            // change this to an instanceof check. until then instanceof
            // checks are to be considered fragile
            if (utils.constructorName(f) === 'Field') {
                if (f.required) {
                    if (!values.hasOwnProperty(k)) {
                        var err = new Error('Required field');
                        err.field = f_path;
                        errors.push(err);
                    }
                }
            }
            else if (utils.constructorName(f) === 'Embedded') {
                var subvals2 = values.hasOwnProperty(k) ? values[k]: {};
                errors = errors.concat(exports.checkRequired(
                    f.type.fields, subvals2, f_path
                ));
            }
            else {
                // recurse through sub-objects in the type's schema to find
                // more fields
                var subvals3 = values.hasOwnProperty(k) ? values[k]: {};
                errors = errors.concat(exports.checkRequired(
                    f, subvals3, f_path
                ));
            }
        }
    }

    log(errors);
    log('------');
    return errors;
};
