/**
 * Renderer constructors and general utilities for rendering Form objects
 * as HTML.
 *
 * @module
 */

/**
 * Module dependencies
 */

var embed = require('kanso/embed'),
    events = require('kanso/events'),
    sanitize = require('kanso/sanitize'),
    _ = require('./underscore')._;

var h = sanitize.escapeHtml;


/**
 * Generates a script tag that fires the event named {name}.
 */

exports.scriptTagForEvent = function (name) {
    var rv = (
        '<script type="text/javascript">' +
        "// <![CDATA[\n" +
            "require('kanso/events').emit('" +
                sanitize.cdata(sanitize.js(name)) +
            "');" +
        "// ]]>" +
        '</script>'
    );

    return rv;
}; 

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
        var html = '<ul class="errors right">';
        for (var i = 0; i < errors.length; i++) {
            html += (
                '<li class="error_msg">' +
                    h(errors[i].message || errors[i].toString()) +
                '</li>'
            );
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
    return '<label for="' + h(id || sanitize.id(name)) + '">' +
        h(exports.labelText(field, name, id)) +
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
        return '<div class="description">' + h(obj.description) + '</div>';
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
        return '<div class="hint">' + h(obj.hint) + '</div>';
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
 * Determines the default renderer class, to be used globally by 
 * instances of forms.Form that fail to specify a renderer class.
 *
 * @name defaultRenderer()
 * @returns {Function}
 * @api public
 */

exports.defaultRenderer = function () {
    return exports.table;
};

/**
 * The default table renderer class, passed to the toHTML method of a
 * form. Renders a form using a single table, with <tbody> tags to
 * represent nested field groups. The <tbody>s are labelled with
 * specific CSS classes, including depth information. See style.css
 * for details on how to style this output.
 *
 * @name table
 * @constructor
 * @api public
 */

exports.table = function () {

    /**
     * Constructor for renderer; initializes object. The string returned
     * from this function is prepended to the form's markup.
     *
     * @constructor
    */
    this.start = function (errs) {
        this.depth = 0;
        var html = '<table class="render-table">';
        if (errs && errs.length) {
            html += '<ul class="form-errors">';
            _.each(errs, function (e) {
                html += '<li>' + (e.message || e.toString()) + '</li>';
            });
            html += '</ul>';
        }
        return html;
    };

    /**
     * Called by the forms layer when it encounters a new
     * nesting context (i.e. a new grouping of fields). The
     * path parameter is an array of strings that describes
     * the path (in terms of document keys) to the new group.
     * When concatenated together with a dot, this array yields
     * the new prefix for named HTML form fields.
     *
     * @param {Array} path
    */
    this.beginGroup = function (path) {
        this.depth += 1;
        var name = _.last(path);
        var css_class = 'level-' + this.depth;

        return (
            '<tbody class="head ' + h(css_class) + '">' +
            '<tr>' +
                '<th colspan="3">' +
                    h(name.substr(0, 1).toUpperCase() +
                        name.substr(1).replace(/_/g, ' ')) +
                '</th>' +
            '</tr>' +
            '</tbody>' +
            '<tbody class="group ' + h(css_class) + '">'
        );
    };

    /**
     * Called by the forms layer when it encounters the end
     * of a nesting context. In the absence of errors, this
     * function is guaranteed to be called once for each time
     * that beginGroup is called; the order will be nested and
     * properly balanced. The path argument is the same as it was
     * for the corresponding beginGroup call; see beginGroup.
     *
     * @param {Array} path
     */
    this.endGroup = function (path) {
        this.depth -= 1;
        return '</tbody>';
    };

    /**
     * Called by the forms layer when it encounters any regular
     * field -- i.e. one that is neither an embed nor an embedList.
     *
     * @param {Object} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
     * @param {Object} options An object containing widget options, which
     *          will ultimately be provided to each widget's toHTML method.
     */
    this.field = function (field, path, value, raw, errors, options) {
        var name = path.join('.');
        var id = (path.join('_') + '_field');
        var caption = path.slice(this.depth).join(' ');

        events.once('renderFinish', function () {
            if (field.widget.clientInit) {
                field.widget.clientInit(
                    field, path, value, raw, errors, {}
                );
            }
        });

        if (field.widget.type === 'hidden') {
            return field.widget.toHTML(
                name, value, raw, field, (options || {})
            );
        }

        var rv = (
            '<tr id="' + id + '" class="' +
                exports.classes(field, errors).join(' ') + '">' +
                '<th>' +
                    exports.labelHTML(field, caption) +
                    exports.descriptionHTML(field) +
                '</th>' +
                '<td>' +
                    exports.errorHTML(errors) +
                    field.widget.toHTML(
                        name, value, raw, field, (options || {})
                    ) +
                    exports.hintHTML(field) +
                '</td>' +
            '</tr>'
        );
        return rv;
    };

    /**
     * Called by the forms layer when it is finished rendering a form.
     * Markup returned from this function is appended to the form output.
     *
     * @param {String} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
    */
    this.end = function () {
        return '</table>';
    };

};

/**
 *  Renders a form using a series of properly-nested <div> tags.
 *  These <div>s are labelled with specific CSS classes, some of which
 *  provide depth information (with the aim of simplifying CSS rules).
 *  See style.css for details on how to style this output.
 */
exports.div = function () {
    /**
     * Constructor for renderer; initializes object. The string returned
     * from this function is prepended to the form's markup.
     *
     * @constructor
    */
    this.start = function (errs) {
        this.depth = 0;
        var html = '<div class="render-div">';
        if (errs && errs.length) {
            html += '<ul class="errors">';
            _.each(errs, function (e) {
                html += '<li>' + (e.message || e.toString()) + '</li>';
            });
            html += '</ul>';
        }
        return html;
    };

    /**
     * Called by the forms layer when it encounters a new
     * nesting context (i.e. a new grouping of fields). The
     * path parameter is an array of strings that describes
     * the path (in terms of document keys) to the new group.
     * When concatenated together with a dot, this array yields
     * the new prefix for named HTML form fields.
     *
     * @param {Array} path
    */
    this.beginGroup = function (path) {
        this.depth += 1;
        var name = _.last(path);
        var css_class = 'level-' + this.depth;
        return (
            '<div class="group ' + h(css_class) + '">' +
            '<div class="heading">' +
                h(name.substr(0, 1).toUpperCase() +
                    name.substr(1).replace(/_/g, ' ')) +
            '</div>'
        );
    };

    /**
     * Called by the forms layer when it encounters the end
     * of a nesting context. In the absence of errors, this
     * function is guaranteed to be called once for each time
     * that beginGroup is called; the order will be nested and
     * properly balanced. The path argument is the same as it was
     * for the corresponding beginGroup call; see beginGroup.
     *
     * @param {Array} path
    */
    this.endGroup = function (path) {
        this.depth -= 1;
        return '</div>';
    };

    /**
     * Called by the forms layer when it encounters any regular
     * field -- i.e. one that is neither an embed nor an embedList.
     *
     * @param {Object} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
     * @param {Object} options An object containing widget options, which
     *          will ultimately be provided to each widget's toHTML method.
    */
    this.field = function (field, path, value, raw, errors, options) {
        var name = path.join('.');
        var caption = path.slice(this.depth).join(' ');
        if (field.widget.type === 'hidden') {
            return field.widget.toHTML(
                name, value, raw, field, (options || {})
            );
        }
        return (
            '<div class="' +
                exports.classes(field, errors).join(' ') + '">' +
            '<div class="scalar">' +
                '<div class="label">' +
                    '<label for="' + h(name) + '">' +
                        exports.labelHTML(field, caption) +
                        exports.descriptionHTML(field) +
                    '</label>' +
                '</div>' +
                '<div class="content">' +
                    '<div class="inner">' +
                        field.widget.toHTML(
                            name, value, raw, field, (options || {})
                        ) +
                    '</div>' +
                    '<div class="hint">' +
                        exports.hintHTML(field) +
                    '</div>' +
                    '<div class="errors">' +
                        exports.errorHTML(errors) +
                    '</div>' +
                '</div>' +
            '</div>' +
            '</div>'
        );
    };

    /**
     * Called by the forms layer when it is finished rendering a form.
     * Markup returned from this function is appended to the form output.
     *
     * @param {String} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
    */
    this.end = function () {
        return '</div>';
    };
};

