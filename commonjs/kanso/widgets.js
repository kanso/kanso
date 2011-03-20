var Widget = exports.Widget = function (type, options) {
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
        html += value.replace(/</g,'&lt;').replace(/>/g,'&gt');
        html += '</textarea>';
        return html;
    };
    return w;
};
