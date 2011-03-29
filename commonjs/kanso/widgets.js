var forms = require('./forms');


var Widget = exports.Widget = function Widget(type, options) {
    options = options || {};
    this.classes = options.classes || [];
    this.id = options.id;
    this.type = type;
};

// generates a string for common widget attributes
Widget.prototype._attrs = function (name) {
    var html = ' name="' + name + '"';
    html += ' id=' + (this.id ? '"' + this.id + '"': '"id_' + name + '"');
    if (this.classes.length) {
        html += ' class="' + this.classes.join(' ') + '"';
    }
    return html;
};

Widget.prototype.toHTML = function (name, value) {
    if (value === null || value === undefined) {
        value = '';
    }
    var html = '<input';
    html += this.type ? ' type="' + this.type + '"': '';
    html += ' value="' + value + '"';
    html += this._attrs(name);
    return html + ' />';
};

exports.text = function (options) {
    return new Widget('text', options);
};

exports.password = function (options) {
    return new Widget('password', options);
};

exports.hidden = function (options) {
    return new Widget('hidden', options);
};

exports.textarea = function (options) {
    var w = new Widget('textarea', options);
    w.toHTML = function (name, value) {
        if (value === null || value === undefined) {
            value = '';
        }
        var html = '<textarea';
        html += this._attrs(name);
        if (options.hasOwnProperty('cols')) {
            html += ' cols="' + options.cols + '"';
        }
        if (options.hasOwnProperty('rows')) {
            html += ' rows="' + options.rows + '"';
        }
        html += '>';
        html += value.replace(/</g, '&lt;').replace(/>/g, '&gt');
        html += '</textarea>';
        return html;
    };
    return w;
};

exports.checkbox = function (options) {
    var w = new Widget('checkbox', options);
    w.toHTML = function (name, value) {
        var html = '<input type="checkbox"';
        html += this._attrs(name);
        html += value ? ' checked="checked"': '';
        return html + ' />';
    };
    return w;
};

exports.select = function (options) {
    var w = new Widget('select', options);
    w.values = options.values;
    w.toHTML = function (name, value) {
        if (value === null || value === undefined) {
            value = '';
        }
        var html = '<select' + this._attrs(name) + '>';
        for (var i = 0; i < this.values.length; i++) {
            var opt = this.values[i];
            html += '<option value="' + opt[0] + '"';
            if (opt[0] === value) {
                html += ' selected="selected"';
            }
            html += '>';
            html += opt[1];
            html += '</option>';
        }
        html += '</select>';
        return html;
    };
    return w;
};

/*
exports.embeddedForm = function (options) {
    var w = new Widget('form', options);
    w.toHTML = function (name, value) {
        return options.form.toHTML(null, forms.render.table, name + '.');
    };
    return w;
};
*/
