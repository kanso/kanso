var _ = require('./underscore')._;


exports.errorHTML = function (errors) {
    if (errors && errors.length) {
        var html = '<ul class="errors">';
        for (var i = 0; i < errors.length; i++) {
            /* Fix me: XSS if a portion of the error string is user input. */
            html += '<li class="error_msg">' +
                (errors[i].message || errors[i].toString()) +
            '</li>';
        }
        html += '</ul>';
        return html;
    }
    return '';
};

exports.labelText = function (field, name) {
    if (field.label) {
        return field.label;
    }
    return name.substr(0, 1).toUpperCase() + name.substr(1).replace(/_/g, ' ');
};

exports.labelHTML = function (field, name, id) {
    return '<label for="' + (id || 'id_' + name) + '">' +
        exports.labelText(field, name, id) +
    '</label>';
};

exports.descriptionHTML = function (obj) {
    if (obj.description) {
        return '<div class="description">' + obj.description + '</div>';
    }
    return '';
};
exports.hintHTML = function (obj) {
    if (obj.hint) {
        return '<div class="hint">' + obj.hint + '</div>';
    }
    return '';
};

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
 *  Renders a form using a single table, with <tbody> tags to represent
 *  nested field groups. The <tbody>s are labelled with specific CSS
 *  classes, including depth information. See style.css for details
 *  on how to style this output.
 */
exports.table = function () {

    /**
     * Constructor for renderer; initializes object. The string returned
     * from this function is prepended to the form's markup.
     *
     * @constructor
    */
    this.start = function () {
        this.depth = 0;
        return '';
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
            '<tbody class="head ' + css_class + '">' +
            '<tr>' +
                '<th colspan="3">' +
                (name.substr(0, 1).toUpperCase() +
                    name.substr(1).replace(/_/g, ' ')) +
                '</th>' +
            '</tr>' +
            '</tbody>' +
            '<tbody class="group ' + css_class + '">'
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
     * @param {String} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
    */
    this.field = function (field, path, value, raw, errors) {
        var name = path.join('.');
        var caption = path.slice(this.depth).join(' ');
        if (field.widget.type === 'hidden') {
            return field.widget.toHTML(name, value, raw);
        }
        return '<tr class="' + exports.classes(field, errors).join(' ') + '">' +
            '<th>' +
                exports.labelHTML(field, caption) +
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

    /**
     * Called by the forms layer when it encounters any embed field.
     * An embed field contains either zero documents (if required is
     * false) or a single document.
     *
     * @param {String} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
    */
    this.embed = function (type, path, value, raw, errors) {
        var name = path.join('.');
        var caption = path.slice(this.depth).join(' ');
        var fval = value ? JSON.stringify(value).replace(/"/g, '&#34;'): '';
        var display_name = value ? value._id: '';
        if (type.display_name && value) {
            display_name = type.display_name(value);
        }
        return '<tr class="embedded">' +
            '<th>' +
                exports.labelHTML(type, caption) +
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

    /**
     * Called by the forms layer when it encounters any embedList field.
     * An embedList field can contain any number of documents.
     *
     * @param {String} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
    */
    this.embedList = function (type, path, value, raw, errors) {
        var name = path.join('.');
        var caption = path.slice(this.depth).join(' ');
        var html = '<tr class="embeddedlist">' +
            '<th>' +
                exports.labelHTML(type, caption) +
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
        return '';
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
    this.start = function () {
        this.depth = 0;
        return '';
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
            '<div class="group ' + css_class + '">' +
            '<div class="heading">' +
                (name.substr(0, 1).toUpperCase() +
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
     * @param {String} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
    */
    this.field = function (field, path, value, raw, errors) {
        var name = path.join('.');
        var caption = path.slice(this.depth).join(' ');
        if (field.widget.type === 'hidden') {
            return field.widget.toHTML(name, value, raw);
        }
        return (
            '<div class="' +
                exports.classes(field, errors).join(' ') + '">' +
            '<div class="scalar">' +
                '<div class="label">' +
                    '<label for="' + name + '">' +
                        exports.labelHTML(field, caption) +
                        exports.descriptionHTML(field) +
                    '</label>' +
                '</div>' +
                '<div class="content">' +
                    '<div class="inner">' +
                        field.widget.toHTML(name, value, raw) +
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
     * Called by the forms layer when it encounters any embed field.
     * An embed field contains either zero documents (if required is
     * false) or a single document.
     *
     * @param {String} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
    */
    this.embed = function (type, path, value, raw, errors) {
        var name = path.join('.');
        var caption = path.slice(this.depth).join(' ');
        var fval = value ? JSON.stringify(value).replace(/"/g, '&#34;'): '';
        var display_name = value ? value._id: '';
        if (type.display_name && value) {
            display_name = type.display_name(value);
        }
        return (
            '<div class="' +
                exports.classes(type, errors).join(' ') + '">' +
            '<div class="embedded">' +
                '<div class="label">' +
                    '<label for="' + name + '">' +
                        exports.labelHTML(type, caption) +
                        exports.descriptionHTML(type) +
                    '</label>' +
                '</div>' +
                '<div class="content" rel="' + type.name + '">' +
                    '<div class="inner" rel="' + name + '">' +
                        '<input type="hidden" value="' +
                            fval + '" name="' + name + '" />' +
                        '<span class="value">' + display_name + '</span>' +
                    '</div>' +
                    '<div class="actions">' +
                    '</div>' +
                    '<div class="errors">' +
                        exports.errorHTML(errors) +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    };

    /**
     * Called by the forms layer when it encounters any embedList field.
     * An embedList field can contain any number of documents.
     *
     * @param {String} field
     * @param {Array} path
     * @param {Object} value
     * @param {String} raw
     * @param {Array} errors
    */
    this.embedList = function (type, path, value, raw, errors) {
        var name = path.join('.');
        var caption = path.slice(this.depth).join(' ');
        var html = (
            '<div class="' +
                exports.classes(type, errors).join(' ') + '">' +
            '<div class="embeddedlist">' +
                '<div class="label">' +
                    '<label for="' + name + '">' +
                        exports.labelHTML(type, caption) +
                        exports.descriptionHTML(type) +
                    '</label>' +
                '</div>' +
                '<div class="content" rel="' + type.name + '">'
        );
        _.each(value, function (v, i) {
            var fval = v ? JSON.stringify(v).replace(/"/g, '&#34;'): '';
            var display_name = v ? v._id: '';
            if (type.display_name && v) {
                display_name = type.display_name(v);
            }
            html += (
                '<div class="item" rel="' + name + '">' +
                    '<div class="inner">' +
                        '<input type="hidden" value="' + fval + '" ' +
                            'name="' + name + '.' + i + '" />' +
                        '<span class="value">' + display_name + '</span>' +
                    '</div>' +
                    '<div class="actions">' +
                    '</div>' +
                '</div>'
            );
        });
        html += (
                '<div class="errors">' +
                    exports.errorHTML(errors) +
                '</div>' +
                '</div>' +
            '</div>' +
            '</div>'
        );

        return html;
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
        return '';
    };
};
