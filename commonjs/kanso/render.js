var _ = require('./underscore')._;


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

exports.table = function () {
    // called at the start of rendering the form
    // the string returned from this function is prepended to the form's markup
    this.start = function () {
        this.depth = 0;
        return '';
    };
    // Called immediately before a new group of fields is processed
    this.beginGroup = function (path) {
        this.depth += 1;
        var name = _.last(path);
        var css_class = 'depth-' + this.depth;
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
    // Called immediately after a group of fields is processed
    this.endGroup = function (path) {
        this.depth -= 1;
        return '</tbody>';
    };
    // Called when any field that is not an embed or embedList field is
    // encountered
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
    // Called when an embed field is encountered
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
    // Called when an embedList field is encountered
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
    // called at the end of rendering the form
    // the string returned from this function is appended to the form's markup
    this.end = function () {
        return '';
    };
};
