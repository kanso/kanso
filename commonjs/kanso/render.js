/**
 * Renderer constructors and general utilities for rendering Form objects
 * as HTML.
 *
 * @module
 */

/**
 * Module dependencies
 */

var _ = require('./underscore')._;


/**
 * Renders HTML for error messages.
 *
 * @name errorHTML(errors)
 * @param {Array} errors
 * @returns {String}
 * @api public
 */

exports.errorHTML = function (errors) {
    if (errors && errors.length) {
        var html = '<ul class="errors">';
        for (var i = 0; i < errors.length; i++) {
            html += '<li class="error_msg">' +
                (errors[i].message || errors[i].toString()) +
            '</li>';
        }
        html += '</ul>';
        return html;
    }
    return '';
};

/**
 * Generates the text for a field's label, depending on whether
 * a custom label is defined or not. If not, the name is captialized and
 * underscores are replaces with spaces to produce the label's text.
 *
 * @name labelText(field, name)
 * @param {Object} field
 * @param {String} name
 * @returns {String}
 * @api public
 */

exports.labelText = function (field, name) {
    if (field.label) {
        return field.label;
    }
    return name.substr(0, 1).toUpperCase() + name.substr(1).replace(/_/g, ' ');
};

/**
 * Generates HTML for label tags.
 *
 * @name labelHTML(field, name, id)
 * @param {Object} field
 * @param {String} name
 * @param {String} id
 * @returns {String}
 * @api public
 */

exports.labelHTML = function (field, name, id) {
    return '<label for="' + (id || 'id_' + name) + '">' +
        exports.labelText(field, name, id) +
    '</label>';
};

/**
 * Generates HTML for field descriptions (if defined).
 *
 * @name descriptionHTML(obj)
 * @param {Object} obj
 * @returns {String}
 * @api public
 */

exports.descriptionHTML = function (obj) {
    if (obj.description) {
        return '<div class="description">' + obj.description + '</div>';
    }
    return '';
};

/**
 * Generates HTML for field hints (if defined).
 *
 * @name hintHTML(obj)
 * @param {Object} obj
 * @returns {String}
 * @api public
 */

exports.hintHTML = function (obj) {
    if (obj.hint) {
        return '<div class="hint">' + obj.hint + '</div>';
    }
    return '';
};

/**
 * Creates an array of default class names for a field. This includes
 * 'required' for required fields and 'error' for fields failing validation.
 *
 * All fields are given a 'field' class.
 *
 * @name classes(field, errors)
 * @param {Object} field
 * @param {Array} errors
 * @returns {Array}
 * @api public
 */

exports.classes = function (field, errors) {
    var r = ['field'];
    if (errors && errors.length) {
        r.push('error');
    }
    if (field.required) {
        r.push('required');
    }
    return r;
};

/**
 * The default table renderer class, passed to the toHTML method of a form, this
 * will render the form's fields inside a table.
 *
 * @name table
 * @constructor
 * @api public
 */

exports.table = function () {
    // called at the start of rendering the form
    // the string returned from this function is prepended to the form's markup
    this.start = function () {
        return '';
    };
    // Called when any field that is not an embed or embedList field is
    // encountered
    this.field = function (field, name, value, raw, errors) {
        if (field.widget.type === 'hidden') {
            return field.widget.toHTML(name, value, raw);
        }
        return '<tr class="' + exports.classes(field, errors).join(' ') + '">' +
            '<th>' +
                exports.labelHTML(field, name) +
                exports.descriptionHTML(field) +
            '</th>' +
            '<td>' +
                field.widget.toHTML(name, value, raw) +
                exports.hintHTML(field) +
            '</td>' +
            '<td class="errors">' +
                exports.errorHTML(errors) +
            '</td>' +
        '</tr>';
    };
    // Called when an embed field is encountered
    this.embed = function (type, name, value, raw, errors) {
        var fval = value ? JSON.stringify(value).replace(/"/g, '&#34;'): '';
        var display_name = value ? value._id: '';
        if (type.display_name && value) {
            display_name = type.display_name(value);
        }
        return '<tr class="embedded">' +
            '<th>' +
                exports.labelHTML(type, name) +
                exports.descriptionHTML(type) +
            '</th>' +
            '<td class="field" rel="' + type.name + '">' +
            '<table rel="' + name + '"><tbody><tr><td>' +
            '<input type="hidden" value="' + fval + '" name="' + name + '" />' +
            '<span class="value">' + display_name + '</span>' +
            '</td>' +
            '<td class="actions"></td>' +
            '</tr></tbody></table>' +
            '<td class="errors">' +
                exports.errorHTML(errors) +
            '</td>' +
        '</tr>';
    };
    // Called when an embedList field is encountered
    this.embedList = function (type, name, value, raw, errors) {
        var html = '<tr class="embeddedlist">' +
            '<th>' +
                exports.labelHTML(type, name) +
                exports.descriptionHTML(type) +
            '</th>' +
            '<td class="field" rel="' + type.name + '">' +
            '<table rel="' + name + '"><tbody>';
        _.each(value, function (v, i) {
            var fval = v ? JSON.stringify(v).replace(/"/g, '&#34;'): '';
            var display_name = v ? v._id: '';
            if (type.display_name && v) {
                display_name = type.display_name(v);
            }
            html += '<tr><td>' +
                '<input type="hidden" value="' + fval + '" ' +
                       'name="' + name + '.' + i + '" />' +
                '<span class="value">' + display_name + '</span>' +
                '</td><td class="actions">' +
                '</td></tr>';
        });
        html += '</tbody></table></td>' +
            '<td class="errors">' +
                exports.errorHTML(errors) +
            '</td>' +
        '</tr>';
        return html;
    };
    // called at the end of rendering the form
    // the string returned from this function is appended to the form's markup
    this.end = function () {
        return '';
    };
};
