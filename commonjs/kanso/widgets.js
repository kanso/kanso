/**
 * Widgets define the way a Field object is displayed when rendered as part of a
 * Form. Changing a Field's widget will be reflected in the admin app.
 */

/**
 * Module dependencies
 */

var forms = require('./forms'),
    utils = require('./utils'),
    events = require('./events');


/**
 * Widget constructor, creates a new Widget object.
 *
 * @param {String} type
 * @param {Object} options
 * @constructor
 * @returns {Widget Object}
 */

var Widget = exports.Widget = function Widget(type, options) {
    options = options || {};
    this.classes = options.classes || [];
    this.id = options.id;
    this.type = type;
};

/**
 * Generates an id string for a widget.
 *
 * @param {String} name - field name on the HTML form
 * @returns {String}
 */

Widget.prototype._id = function (name) {
    return (this.id ? this.id : 'id_' + name);
};


/**
 * Generates a string for common widget attributes.
 *
 * @param {String} name - field name on the HTML form
 * @returns {String}
 */

Widget.prototype._attrs = function (name) {
    var html = ' name="' + name + '" id="' + this._id(name) + '"';
    if (this.classes.length) {
        html += ' class="' + this.classes.join(' ') + '"';
    }
    return html;
};


/**
 * Generates a script tag that invokes the widget's init() function
 * within the client's web browser. This function uses the widget's
 * type attribute to resolve the widget's (js) class, and the widget's
 * id to resolve a particular instance of the widget's markup on the page.
 *
 * @param {String} name - field name on the HTML form
 * @param {String} module - optional; the commonjs module to call in to.
 *                  By default, this is 'kanso/widgets', i.e. this module.
 * @param {String} namespace - optional; the namespace containing the widget
 *                  initialization functions. By default, this is 'init'.
 * @returns {String}
 */

Widget.prototype.scriptTagForInit = function (name, module, namespace)
{
    if (module === undefined) {
        module = 'kanso/widgets';
    }
    if (namespace === undefined) {
        namespace = 'init';
    }
    console.log(
        '<script type="text/javascript">' +
            "require('" + module + "')." + namespace + '.' +
                this.type + "($('#" + this._id(name) + "'));" +
        '</script>'
    );
    return (
        '<script type="text/javascript">' +
            "require('" + module + "')." + namespace + '.' +
                this.type + "($('#" + this._id(name) + "'));" +
        '</script>'
    );
}


/**
 * Converts a widget to HTML using the provided name and parsed and raw values
 *
 * @param {String} name
 * @param value
 * @param raw
 * @returns {String}
 */

Widget.prototype.toHTML = function (name, value, raw) {
    if (raw === undefined) {
        raw = (value === undefined) ? '': '' + value;
    }
    if (raw === null || raw === undefined) {
        raw = '';
    }
    var html = '<input';
    html += this.type ? ' type="' + this.type + '"': '';
    html += ' value="' + raw + '"';
    html += this._attrs(name);
    return html + ' />';
};

/**
 * Storage for client-side widget initialization functions.
 * For more information, see initScriptTag's documentation.
 */

exports.init = {};

/**
 * Creates a new text input widget.
 *
 * @param options
 * @returns {Widget Object}
 */

exports.text = function (options) {
    return new Widget('text', options);
};

/**
 * Creates a new password input widget.
 *
 * @param options
 * @returns {Widget Object}
 */

exports.password = function (options) {
    return new Widget('password', options);
};

/**
 * Creates a new hidden input widget.
 *
 * @param options
 * @returns {Widget Object}
 */

exports.hidden = function (options) {
    return new Widget('hidden', options);
};

/**
 * Creates a new textarea widget.
 *
 * @param options
 * @returns {Widget Object}
 */

exports.textarea = function (options) {
    options = options || {};
    var w = new Widget('textarea', options);
    w.toHTML = function (name, value, raw) {
        if (raw === undefined) {
            raw = (value === undefined) ? '': '' + value;
        }
        if (raw === null || raw === undefined) {
            raw = '';
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
        html += utils.escapeHTML(raw);
        html += '</textarea>';
        return html;
    };
    return w;
};

/**
 * Creates a new checkbox widget.
 *
 * @param options
 * @returns {Widget Object}
 */

exports.checkbox = function (options) {
    var w = new Widget('checkbox', options);
    w.toHTML = function (name, value, raw) {
        var html = '<input type="checkbox"';
        html += this._attrs(name);
        html += value ? ' checked="checked"': '';
        return html + ' />';
    };
    return w;
};

/**
 * Creates a new select widget.
 *
 * @param options
 * @returns {Widget Object}
 */

exports.select = function (options) {
    var w = new Widget('select', options);
    w.values = options.values;
    w.toHTML = function (name, value, raw) {
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

/**
 * Creates a new computed widget. Computed widgets display a string, but are
 * uneditable, working as a hidden field behind the scenes.
 *
 * @param options
 * @returns {Widget Object}
 */

exports.computed = function (options) {
    var w = new Widget('computed', options);
    w.toHTML = function (name, value, raw) {
        if (raw === undefined) {
            raw = (value === undefined) ? '': '' + value;
        }
        if (raw === null || raw === undefined) {
            raw = '';
        }
        var html = '<input type="hidden" value="' + raw + '"';
        html += this._attrs(name) + ' />';
        html += '<span>' + utils.escapeHTML(raw) + '</span>';
        return html;
    };
    return w;
};


/**
 * Creates a new selector widget. This widget allows the user
 * to select a document from a CouchDB view (specified in options).
 *
 * @param options
 * @returns {Widget Object}
 */

exports.selector = function (options) {
    var w = new Widget('selector', options);
    w.viewName = options.viewName;
    w.toHTML = function (name, value, raw) {
        var html = (
            '<div class="widget-selector">' +
                '<input type="hidden"' + this._attrs(name) + ' />' +
                '<select></select>' +
            '</div>' +
            this.scriptTagForInit(name)
        );
        return html;
    };
    return w;
};

/**
 * Client-side initialization function for a selector control.
 */

exports.init.selector = function (_singleton_elt) {
    var input_elt = _singleton_elt.first();
    var container_elt = input_elt.parent();
    var select_elt = $('input[type=hidden] ~ select', container_elt);
};


