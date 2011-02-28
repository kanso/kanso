var fields_module = require('./fields'),
    Field = fields_module.Field,
    types = require('./types'),
    Type = types.Type,
    utils = require('./utils');


var Form = exports.Form = function (obj, doc) {
    this.fields = (obj instanceof Type) ? obj.fields: obj;
    if (doc) {
        this.values = doc;
    }
};

Form.prototype.validate = function (req) {
    this.values = exports.parseRequest(req);
    var validation_errors = types.validateFields(
        this.fields, this.values, this.values, [], false
    );
    var required_errors = types.checkRequired(this.fields, this.values, []);
    this.errors = required_errors.concat(validation_errors);
    return this;
};

Form.prototype.toHTML = function (iterator) {
    iterator = iterator || exports.render.div;
    return exports.renderFields(
        iterator, this.fields, this.values, this.errors, []
    );
};

Form.prototype.isValid = function () {
    return (!this.errors || this.errors.length === 0);
};

exports.parseRequest = function (req) {
    var values = {};
    for (var k in req.form) {
        utils.setPropertyPath(values, k.split('.'), req.form[k]);
    }
    return values;
};

exports.getErrors = function (errors, path) {
    if (!errors || !errors.length) {
        return [];
    }
    var errs = [];
    var field_name = path.join('.');
    for (var i = 0; i < errors.length; i++) {
        if (errors[i].field.join('.') === field_name) {
            errs.push(errors[i]);
        }
    }
    return errs;
};

exports.renderFields = function (iterator, fields, values, errors, path) {
    var html = '';
    for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
            var field = fields[k];
            var value;
            if (values) {
                value = utils.getPropertyPath(values, path.concat([k]));
            }
            else if (field.default_value) {
                value = field.default_value;
            }
            var errs = exports.getErrors(errors, path.concat([k]));
            if (field instanceof Field) {
                var name = path.concat([k]).join('.');
                html += iterator(name, field, value, errs);
            }
            else if (utils.isArray(field)) {
                // TODO: handle arrays
                throw new Error('not implemented');
            }
            else {
                // sub-object, recurse through and check for more fields
                html += exports.renderFields(
                    iterator, field, value, errors, path.concat([k])
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
        // TODO: handle hidden, multipleCheckbox and multipleRadio fields
        return '<tr class="' + field.classes(errors).join(' ') + '">' +
            '<th>' + field.labelHTML(name) + '</th>' +
            '<td>' +
                field.errorHTML(errors) +
                field.widget.toHTML(name, value) +
            '</td>' +
        '</tr>';
    }
};
