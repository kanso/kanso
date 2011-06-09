/**
 * Widgets define the way a Field object is displayed when rendered as part of a
 * Form. Changing a Field's widget will be reflected in the admin app.
 *
 * @module
 */

/**
 * Module dependencies
 */

var db = require('./db'),
    render = require('./render'),
    utils = require('./utils'),
    _ = require('./underscore')._;


/**
 * Widget constructor, creates a new Widget object.
 *
 * @name Widget(type, [options])
 * @param {String} type
 * @param {Object} options
 * @constructor
 * @returns {Widget Object}
 * @api public
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
 * @param {String} extension - optional; a string to be added
 *                  to the generated identifier. Use this when you
 *                  want to make an identifier that is related to
 *                  an existing identifier, but is still unique.
 * @returns {String}
 */

Widget.prototype._id = function (name, extension) {
    return (
        this.id ? this.id : 'id_' + name.replace(/[^\w]+/, '_')
    ) + (
        extension ? ('_' + extension) : ''
    );
};


/**
 * Generates a string for common widget attributes.
 *
 * @param {String} name - field name on the HTML form
 * @param {String} id_extension - optional; a string to be added
 *                  to the generated DOM identifier. Use this when you
 *                  want to make an identifier that is related to
 *                  an existing identifier, but is still unique. The
 *                  HTML form name will not b changed.
 * @returns {String}
 * @api private
 */

Widget.prototype._attrs = function (name, id_extension) {
    var html = (
        ' name="' + name + '" id="' +
            this._id(name, id_extension) + '"'
    );
    if (this.classes.length) {
        html += ' class="' + this.classes.join(' ') + '"';
    }
    return html;
};


/**
 * A specialized version of scriptTagForInit, for use with custom widgets.
 * This function generates a script tag, which invokes a client-side
 * initialization function -- within the client's web browser -- for the
 * widget. This function uses the widget's type attribute to resolve the
 * name of the widget's initialization function; it uses the widget's
 * id to locate the widget's markup on the page.
 *
 * @param {String} name - field name on the HTML form
 * @param {Object} options - data to be passed to init function.
 * @param {String} module - optional; the commonjs module to load. This
 *                  module should export an object named identically to the
 *                  value you pass for namespace; that object should contain
 *                  initialization functions, with names matching each
 *                  widget type. By default, this is 'kanso/widgets'.
 * @param {String} namespace - optional; the namespace (an object) that
 *                  contains widget initialization functions for the module.
 *                  By default, this namespace is called 'init'.
 * @returns {String}
 * @api public
 */

Widget.prototype.scriptTagForInit = function (name, options, module, namespace)
{
    return render.scriptTagForInit(
        (module || 'kanso/widgets'), 
            ((namespace || 'init') + '.' + this.type),
            options, ("$('#" + this._id(name) + "')")
    );
}

/**
 * Converts a widget to HTML using the provided name and parsed and raw values
 *
 * @name Widget.toHTML(name, value, raw)
 * @param {String} name
 * @param value
 * @param raw
 * @returns {String}
 * @api public
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
 * For more information, see scriptTagForInit's documentation.
 */

exports.init = {};

/**
 * Creates a new text input widget.
 *
 * @name text([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.text = function (options) {
    return new Widget('text', options);
};

/**
 * Creates a new password input widget.
 *
 * @name password([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.password = function (options) {
    return new Widget('password', options);
};

/**
 * Creates a new hidden input widget.
 *
 * @name hidden([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.hidden = function (options) {
    return new Widget('hidden', options);
};

/**
 * Creates a new field for storing/displaying an embedded object.
 * This is automatically added to embed and embedList field types
 * that don't specify a widget.
 *
 * @name embedded([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.defaultEmbedded = function (options) {
    var w = new Widget('embedded', options);
    w.toHTML = function (name, value, raw, field) {

        var display_name = (value ? value._id: '');
        var fval = (value ? utils.escapeHTML(JSON.stringify(value)) : '');

        if (field.type.display_name && v) {
            display_name = field.type.display_name(v);
        }
        var html = (
            '<input type="hidden" ' +
                'value="' + fval + '" name="' + name + '" />' +
            '<span class="value">' + display_name + '</span>'
        );
        return html;
    };
    return w;
};

/**
 * Creates a new textarea widget.
 *
 * @name textarea([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.textarea = function (options) {
    options = options || {};
    var w = new Widget('textarea', options);
    w.toHTML = function (name, value, raw, field) {
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
 * @name checkbox([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.checkbox = function (options) {
    var w = new Widget('checkbox', options);
    w.toHTML = function (name, value, raw, field) {
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
 * @name select([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.select = function (options) {
    var w = new Widget('select', options);
    w.values = options.values;
    w.toHTML = function (name, value, raw, field) {
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
 * @name computed([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.computed = function (options) {
    var w = new Widget('computed', options);
    w.toHTML = function (name, value, raw, field) {
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
 * Creates a new document selector widget. This widget allows the
 * user to select a document from a CouchDB view (specified in options).
 *
 * @param options
 * @returns {Widget Object}
 */

exports.documentSelector = function (options) {
    var w = new Widget('documentSelector', options);
    w.options = options;
    w.toHTML = function (name, value, raw, field) {
        var input_html = (
            '<input class="backing" type="hidden" ' + (
                this.options.storeValue ?
                    this._attrs(name) : ('id="' + this._id(name) + '"')
            ) + ' />'
        );
        var select_html = (
            '<select class="selector" ' + (
                this.options.storeValue ?
                    ('id="' + this._id(name, 'visible') + '"') :
                        this._attrs(name, 'visible')
            ) + '></select>'
        );
        return (
            '<div class="widget layout">' +
            '<div class="selector">' +
                input_html + select_html +
                '<div class="spinner" style="display: none;"></div>' +
            '</div>' +
            '</div>' +
            this.scriptTagForInit(name, _.extend(this.options, {
                value: value
            }))
        );
    };
    return w;
};

/**
 * Selector widget: client-side initialization function.
 */

exports.init.documentSelector = function (_singleton_elt, _options) {

    var container_elt = _singleton_elt.first().parent();
    var hidden_elt = $('input.backing', container_elt);
    var select_elt = $('input.backing ~ select.selector', container_elt);
    var spinner_elt = $('input.backing ~ .spinner', container_elt);

    var options = (_options || {});
    var value = options.value;

    if (options.storeValue) {
        select_elt.bind('change', function () {
            /* Copy data to backing element */
            hidden_elt.val(select_elt.val());
        });
    }

    spinner_elt.show();

    db.getView(options.viewName, {}, { db: options.db }, function (err, rv) {
        if (err) {
            throw new Error(
                'Failed to request content from CouchDB view `' +
                    options.viewName + '`'
            );
        }

        /* Option for 'no selection' */
        var nil_option = $(document.createElement('option'));
        if (!value) {
            nil_option.attr('selected', 'selected');
        }
        select_elt.append(nil_option);

        /* All other options */
        _.each(rv.rows || [], function(r) {
            var option = $(document.createElement('option'));
            if (r.id == value) {
                option.attr('selected', 'selected');
            }
            option.val(r.id);
            option.text(r.value);
            select_elt.append(option);
        });

        spinner_elt.hide();
    
        if (options.storeValue) {
            select_elt.trigger('change');
        }
    });
};


