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
    actions = require('./actions'),
    render = require('./render'),
    sanitize = require('./sanitize'),
    utils = require('./utils'),
    _ = require('./underscore')._;

var h = sanitize.escapeHtml;


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
    options = (options || {});
    this.classes = (options.classes || []);
    this.id = options.id;
    this.type = type;
    this.options = options;
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

Widget.prototype._id = function (name /* , ... */) {
    return sanitize.generateDomIdentifier.apply(
        this, [ this.id || name ].concat(
            Array.prototype.slice.call(arguments, 1)
        )
    );
};

/**
 * Generates a name string for a widget.
 *
 * @param {String} name - field name on the HTML form
 * @param {String} extension - optional; a string to be added
 *                  to the generated identifier. Use this when you
 *                  want to make an identifier that is related to
 *                  an existing identifier, but is still unique.
 * @returns {String}
 */

Widget.prototype._name = function (name /* , ... */) {
    return sanitize.generateDomName.apply(
        this, [ name ].concat(
            Array.prototype.slice.call(arguments, 1)
        )
    );
};

/**
 * Generates a string for common widget attributes.
 *
 * @param {String} name - field name on the HTML form
 * @param {String} extension - optional; a string to be added
 *                  to the generated DOM identifier. Use this when you
 *                  want to make an identifier that is related to
 *                  an existing identifier, but is still unique. The
 *                  HTML form name will not b changed.
 * @returns {String}
 * @api private
 */

Widget.prototype._attrs = function (name) {
    var html = (
        ' name="' + h(this._name.apply(this, arguments)) +
            '" id="' + h(this._id.apply(this, arguments)) + '"'
    );
    if (this.classes.length > 0) {
        html += ' class="' + h(this.classes.join(' ')) + '"';
    }
    return html;
};

/**
 * Converts an input element's value attribute to a valid
 * in-memory representation of the document or document fragment.
 * This function tries to interpret the string as JSON if it's
 * appropriate; otherwise the string is left alone.
 *
 * @name _parse_value(str, type_name)
 * @param {String} str The string value to parse
 * @param {String} type_name The type of field that the input control
 *          belongs to. This value may influence how str is parsed.
 * @returns {Object}
 */

Widget.prototype._parse_value = function (str, type_name)
{
    /* TODO:
        This function needs to actually check type_name... */

    var rv = null;

    try {
        rv = JSON.parse(str);
    } catch (e) {
        rv = str;
    }

    return rv;
};

/**
 * Converts a widget to HTML using the provided name and parsed and raw values
 *
 * @name Widget.toHTML(name, value, raw, field, options)
 * @param {String} name
 * @param value
 * @param raw
 * @param field
 * @param options
 * @returns {String}
 * @api public
 */

Widget.prototype.toHTML = function (name, value, raw, field, options) {
    if (raw === undefined) {
        raw = (value === undefined) ? '': '' + value;
    }
    if (raw === null || raw === undefined) {
        raw = '';
    }
    var html = '<input';
    html += (this.type ? ' type="' + h(this.type) + '"': '');
    html += ' value="' + h(raw) + '"';
    html += this._attrs(name);
    return html + ' />';
};

/**
 * Initializes a widget on the client-side only, using the browser's
 * script interpreter. This function is guaranteed to be called
 * after toHTML, and any DOM elements created by toHTML are
 * guaranteed to be accessible
 *
 * @name Widget.clientInit(path, value, raw, field, options)
 * @param {Array} path
 * @param value
 * @param raw
 * @param field
 * @param options
 * @returns {Boolean}
 * @api public
 */

Widget.prototype.clientInit = function (path, value, raw, field, options) {
    return true;
};

/**
 * Called by Kanso when it becomes necessary to rename this widget
 * instance. The widget should respond by updating the id and name
 * attributes.
 *
 * @name Widget.updateName(path)
 * @param {String} elt An element that contains one or
 *          more instances of the widget referenced by `this'.
 * @param {String} path The widget's new path; combine this using
 *          the _name or _id function to generate a usable string.
 * @param {Object} options A new set of toHTML/clientInit options.
 *          This may or may not influence the widget's name.
 * @api public
 */

Widget.prototype.updateName = function (elt, path, options) {
    var e = $('input[type=hidden]', elt);
    e.attr('id', this._id(path));
    e.attr('name', this._name(path));
};

/**
 * Called by Kanso when it becomes necessary to rename this widget
 * instance. The widget should respond by updating the value attribute.
 *
 * @name Widget.updateValue(elt, path, value, options)
 * @param {String} elt An element that contains one or
 *          more instances of the widget referenced by `this'.
 * @param {String} path The path to the widget.
 * @param {Object} value The new value for the widget, unencoded.
 * @param {Object} options An up-to-date set of toHTML/clientInit options.
 * @api public
 */

Widget.prototype.updateValue = function (elt, path, value, options) {
    var elt = $('#' + this._id(path));
    elt.val(value);
};

/**
 * Called by Kanso when it becomes necessary to interrogate this
 * widget to determine its value. The widget should respond by
 * returning an unencoded value (typically as an object).
 *
 * @name Widget.getValue(elt, path, options)
 * @param {String} elt An element that contains one or
 *          more instances of the widget referenced by `this'.
 * @param {String} path The path to the widget.
 * @param {Object} options An up-to-date set of toHTML/clientInit options.
 * @api public
 */

Widget.prototype.getValue = function (elt, path, options) {
    var elt = $('#' + this._id(path));
    return elt.val();
};
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
            html += ' cols="' + h(options.cols) + '"';
        }
        if (options.hasOwnProperty('rows')) {
            html += ' rows="' + h(options.rows) + '"';
        }
        html += '>' + h(raw);
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
        html += (value ? ' checked="checked"': '');
        return (html + ' />');
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
            html += '<option value="' + h(opt[0]) + '"';
            if (opt[0] === value) {
                html += ' selected="selected"';
            }
            html += '>';
            html += h(opt[1]);
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
        var html = '<input type="hidden" value="' + h(raw) + '"';
        html += this._attrs(name) + ' />';
        html += '<span>' + h(raw) + '</span>';
        return html;
    };
    return w;
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

exports.embedList = function (_options) {
    var w = new Widget('embedList', _options);

    w.sortable = _options.sortable;
    w.singleton = _options.singleton;
    w.actions = actions.parse(_options.actions || {});
    w.widget = (_options.widget || exports.defaultEmbedded());

    w.toHTML = function (name, value, raw, field, options) {
        this.cacheInit();
        this.field = field;
        var id = this._id(name, 'list', options.path_extra);

        var html = (
            '<div class="embedlist" rel="' +
                h(this.field.type.name) + '" id="' + h(id) + '">'
        );

        value = (value instanceof Array ? value : []);
        html += '<div class="items" rel="' + h(name) + '">';

        for (var i = 0, len = value.length; i < len; ++i) { 
            html += this.htmlForListItem(name, {
                offset: (this.singleton ? null : i),
                name: name, value: value[i], raw: raw,
            });
        }
        html += (
                '</div>' +
            '<div class="actions">'
        );
        if (i == 0 || !this.singleton) {
            html += this.htmlForAddButton();
        }
        html += (
                '</div>' +
            '</div>'
        );
        return html;
    };

    w.clientInit = function(field, path, value, raw, errors, options) {
        this.cacheInit();
        this.field = field;

        var item_elts = (
            this.discoverListItemsElement(path).children('.item')
        );
        for (var i = 0, len = item_elts.length; i < len; ++i) {
            this.bindEventsForListItem(path, item_elts[i]);

            if (this.widget.clientInit) {
                this.widget.clientInit(
                    this.field, path, value[i], value[i], [],
                        { offset: i }
                );
            }
        }

        this.renumberList(path);
        this.bindEventsForList(path);
    };

    /** private: **/

    w.cacheInit = function () {
        this.discoverListElement = _.memoize(this._discoverListElement);
        this.discoverListName = _.memoize(this._discoverListName);
        this.discoverListType = _.memoize(this._discoverListType);
        this.discoverListItemsElement = _.memoize(this._discoverListItemsElement);
    };

    w._discoverListElement = function (path) {
        var name = (
            path instanceof Array ?  this._name(path) : path
        );
        return $('#' + this._id(name, 'list'));
    };

    w._discoverListName = function (path) {
        var list_elt = this.discoverListElement(path);
        var actions_elt = $(list_elt).closestChild('.actions');
        return actions_elt.attr('rel');
    };
    
    w._discoverListType = function (path) {
        var list_elt = this.discoverListElement(path);
        return list_elt.attr('rel');
    };

    w._discoverListItemsElement = function (path) {
        var list_elt = this.discoverListElement(path);
        return list_elt.closestChild('.items');
    };

    w.discoverListItems = function (path) {
        return this.discoverListItemsElement(path).children('.item');
    },

    w.countListItems = function (path) {
        return this.discoverListItems(path).length;
    },

    w.bindEventsForList = function(path) {
        var list_elt = this.discoverListElement(path);
        var add_elt = $(list_elt).closestChild('.actions .add');

        add_elt.bind('click', utils.bindContext(this, function (ev) {
            return this.handleAddButtonClick(ev, path);
        }));
    };

    w.bindEventsForListItem = function (path, item_elt) {
        item_elt = $(item_elt);
        var edit_elt = item_elt.closestChild('.actions .edit');
        var delete_elt = item_elt.closestChild('.actions .delete');

        edit_elt.bind('click', utils.bindContext(this, function(ev) {
            return this.handleEditButtonClick(ev, path);
        }));

        delete_elt.bind('click', utils.bindContext(this, function(ev) {
            return this.handleDeleteButtonClick(ev, path);
        }));

        if (this.sortable) {
            var up_elt = item_elt.closestChild('.actions .up');
            var down_elt = item_elt.closestChild('.actions .down');

            up_elt.bind('click', utils.bindContext(this, function(ev) {
                return this.handleUpButtonClick(ev, path);
            }));

            down_elt.bind('click', utils.bindContext(this, function(ev) {
                return this.handleDownButtonClick(ev, path);
            }));
        }
    };

    w.renumberList = function (path) {
        var item_elts =
            this.discoverListItemsElement(path).children('.item');

        for (var i = 0, len = item_elts.length; i < len; ++i) {
            var item = $(item_elts[i]);
            this.renumberListItem(item, path, i);
            this.adjustListItemActions(item, i, len);

        };
        
        return this.adjustListActions(path);
    };

    w.renumberListItem = function (elt, path, offset) {
        var name = this._name(path);
        var options = (this.singleton ? null : { offset: offset });

        if (this.widget.updateName) {
            this.widget.updateName(elt, path, options);
        }
    };

    w.adjustListActions = function (path, offset) {
        var list_elt = this.discoverListElement(path);
        var add_elt = list_elt.closestChild('.actions .add');

        if (this.singleton && offset > 0) {
            add_elt.hide();
        } else {
            add_elt.show();
        }
        return offset;
    };

    w.adjustListItemActions = function (item_elt, offset, count) {
        if (this.sortable) {
            var attr = 'disabled';
            var up_elt = item_elt.closestChild('.actions .up');
            var down_elt = item_elt.closestChild('.actions .down');

            if (offset <= 0) {
                up_elt.attr(attr, attr);
            } else {
                up_elt.removeAttr(attr);
            }
            if (offset + 1 >= count) {
                down_elt.attr(attr, attr);
            } else {
                down_elt.removeAttr(attr);
            }
        }
    };

    w.moveExistingItem = function (path, after_elt, item_elt) {
        if (after_elt) {
            $(after_elt).after(item_elt);
        } else {
            var items_elt = this.discoverListItemsElement(path);
            items_elt.append(item_elt);
        }
        this.renumberList(path);
        this.bindEventsForListItem(path, item_elt);
    };

    w.insertNewItemAtEnd = function (path) {
        var list_elt = this.discoverListElement(path);

        var item_elts =
            this.discoverListItemsElement(path).children('.item');

        var last_elt = item_elts.last();
        return this.insertNewItem(
            path, (this.singleton ? null : item_elts.length),
                last_elt[0]
        );
    };

    w.insertNewItem = function(path, offset, after_elt) {
        var list_elt = this.discoverListElement(path);
        var list_type = this.discoverListType(path);

        db.newUUID(100, utils.bindContext(this, function (err, uuid) {
            var value = { type: list_type, _id: uuid };
            var item_elt = $(this.htmlForListItem(path, {
                name: this._name(path),
                offset: offset, value: value, raw: value
            }));

            this.moveExistingItem(path, after_elt, item_elt);

            if (this.widget.clientInit) {
                this.widget.clientInit(
                    this.field, path, value, value, [], {
                        offset: offset
                    }
                );
            }
        }))
    };

    w.setListItemValue = function(elt, path, value, offset) {
        if (this.widget.updateValue) {
            this.widget.updateValue(elt, path, value, { offset: offset });
        }
    };

    w.htmlForListItem = function(path, item) {
        var html = (
            '<div class="item">' +
                '<div class="actions">' +
                    (this.options.sortable ? this.htmlForDownButton() : '') +
                    (this.options.sortable ? this.htmlForUpButton() : '') +
                    this.htmlForEditButton() + this.htmlForDeleteButton() +
                '</div>' +
                this.widget.toHTML(
                    item.name, item.value, item.raw, this.field,
                        { offset: item.offset }
                ) +
            '</div>'
        );
        return html;
    };

    w.htmlForAddButton = function() {
        return (
            '<input type="button" class="add action" value="Add" />'
        );
    };

    w.htmlForEditButton = function() {
        return (
            '<input type="button" class="edit action" value="Edit" />'
        );
    };

    w.htmlForDeleteButton = function() {
        return (
            '<input type="button" class="delete action" value="Delete" />'
        );
    };

    w.htmlForUpButton = function() {
        return (
            '<input type="button" class="up action" value="&uarr;" />'
        );
    };

    w.htmlForDownButton = function() {
        return (
            '<input type="button" class="down action" value="&darr;" />'
        );
    };

    w.handleUpButtonClick = function (ev, path) {
        var item_elt = $(ev.target).closest('.item');
        item_elt.insertBefore(item_elt.prev('.item'));
        this.renumberList(path);
    };

    w.handleDownButtonClick = function (ev, path) {
        var item_elt = $(ev.target).closest('.item');
        item_elt.insertAfter(item_elt.next('.item'));
        this.renumberList(path);
    };

    w.handleAddButtonClick = function (ev, path) {
        this.insertNewItemAtEnd(path);
    };

    w.handleEditButtonClick = function (ev, path) {
        var offset = 0;
        var name = this._name(path);
        var type_name = this.discoverListType(path);
        var item_elt = $(ev.target).closest('.item');

        var value = this.widget.getValue(item_elt, path);
        var widget_options = { offset: offset, path_extra: [] };

        /* Action will transfer control here when finished */
        var cb = utils.bindContext(this, function (successful, new_value) {
            this.handleEditCompletion.call(
                this, ev, path, offset, successful, new_value
            );
        });

        if (this.actions.edit) {
            this.actions.edit(
                type_name, this.field, path,
                    value, value, [], widget_options, cb
            );
        }
    };

    w.handleEditCompletion = function (ev, path, offset, is_successful, new_value) {
        if (is_successful) {
            var item_elt = $(ev.target).closest('.item', this);
            this.setListItemValue(
                item_elt, path, new_value, offset
            );
        }
        return is_successful;
    };

    w.handleDeleteButtonClick = function (ev, path) {
        var item_elt = $(ev.target).closest('.item', this);
        item_elt.remove();
        this.renumberList(path);
    };

    return w;
};

/**
 * Creates a new field for storing/displaying an embedded object.
 * This is automatically added to embed and embedList field types
 * that don't specify a widget.
 *
 * @name defaultEmbedded([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.defaultEmbedded = function (_options) {
    var w = new Widget('defaultEmbedded', _options);
    w.toHTML = function (name, value, raw, field, options) {
        var display_name = (value ? value._id: '');
        var fval = (value ? utils.escapeHTML(JSON.stringify(value)) : '');

        if (field && field.type.display_name && value) {
            display_name = field.type.display_name(value);
        }
        var html = (
            '<div class="embedded embed">' + 
                '<input type="hidden" value="' + fval + '" name="' +
                    h(this._name(name, options.offset)) + '" />' +
                '<span class="value">' + h(display_name) + '</span>' +
            '</div>'
        );
        return html;
    };
    return w;
};

/**
 * Creates a new instance of an embedded *form* for the specified type.
 * This is the basis for the presentation of complex data types in Kanso,
 * and is used within an embedList to add and/or edit items.
 *
 * @name embedForm([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.embedForm = function (_options) {
    var w = new Widget('embedForm', _options);
    w.toHTML = function (name, value, raw, field, options) {
        var type = this.options.type;
        var form = new forms.Form(type, value);
        var html = (
            '<div class="embedded form">' +
                form.toHTML() +
            '</div>'
        );
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

exports.documentSelector = function (_options) {
    var w = new Widget('documentSelector', _options);
    w.toHTML = function (name, value, raw, field, options) {
        var html_value = (
            value instanceof Object ?
                JSON.stringify(value) : value
        );
        var input_html = (
            '<input class="backing"' +
                ' type="hidden" value="' + h(html_value) + '" id="' +
                this._id(name, options.offset, options.path_extra) +
                '" name="' + this._name(name, options.offset) + '" />'
        );
        var select_html = (
            '<select class="selector" id="' + h(
                this._id(name, 'visible', options.offset, options.path_extra)
             ) + '"></select>'
        );
        var html = (
            '<div class="widget layout">' +
            '<div class="selector">' +
                input_html + select_html +
                '<div class="spinner" style="display: none;"></div>' +
            '</div>' +
            '</div>'
        );

        return html;
    };

    w.updateName = function (elt, path, options) {
        elt = $(elt);
        var select_elt = elt.closestChild('select.selector');
        var hidden_elt = elt.closestChild('input[type=hidden].backing');

        select_elt.attr('id', this._id(
            path, 'visible', options.offset, options.path_extra
        ));
        hidden_elt.attr('id', this._id(
            path, options.offset, options.path_extra
        ));
        select_elt.attr('name', this._name(
            path, 'visible', options.offset, options.path_extra
        ));
        hidden_elt.attr('name', this._name(
            path, options.offset, options.path_extra
        ));
    };

    w.updateValue = function (elt, path, value, options) {
        elt = $(elt);
        var value = JSON.stringify(value);
        var select_elt = elt.closestChild('select.selector');
        var hidden_elt = elt.closestChild('input[type=hidden].backing');

        hidden_elt.val(value);
        select_elt.val(value);
    };

    w.getValue = function (elt, path, options) {
        elt = $(elt);
        var hidden_elt = elt.closestChild('input[type=hidden].backing');
        return JSON.parse(hidden_elt.attr('value'));
    };

    w.clientInit = function (field, path, value, raw, errors, options) {

        var id = this._id(path, options.offset, options.path_extra);
        var container_elt = $('#' + id).parent();

        var select_elt = container_elt.closestChild('.selector');
        var spinner_elt = container_elt.closestChild('.spinner');
        var options = (this.options || {});
        var is_embedded = (value instanceof Object);

        var hidden_elt = (
            container_elt.closestChild('input[type=hidden].backing')
        );

        /* Start progress */
        spinner_elt.show();

        /* Copy data to backing element */
        select_elt.bind('change', function () {
            hidden_elt.val(select_elt.val());
        });
        /* Fetch contents */
        db.getView(
            options.viewName,
            { include_docs: is_embedded }, { db: options.db },
            function (err, rv) {
                /* Error handling */
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
                    var is_selected = (
                        is_embedded ? (value._id === r.id) : (value === r.id)
                    );
                    if (is_selected) {
                        option.attr('selected', 'selected');
                    }
                    option.val(
                        (is_embedded ? JSON.stringify(r.doc) : r.id)
                    );
                    option.text(r.value);
                    select_elt.append(option);
                });

                /* Finished */
                spinner_elt.hide();
                select_elt.trigger('change');
        });
    };
    return w;
};

/* 
 * closestChild for jQuery
 * Copyright 2011, Tobias Lindig
 * 
 * Dual licensed under the MIT license and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.opensource.org/licenses/gpl-license.php
 * 
 */

if (utils.isBrowser()) {
    (function($) {
        $.fn.closestChild = function(selector) {
            /* Breadth-first search for the first matched node */
            if (selector && selector != '') {
                var queue = [];
                queue.push(this);
                while(queue.length > 0) {
                    var node = queue.shift();
                    var children = node.children();
                    for(var i = 0; i < children.length; ++i) {
                        var child = $(children[i]);
                        if (child.is(selector)) {
                            return child;
                        }
                        queue.push(child);
                    }
                }
            }
            return $(); /* Nothing found */
        };
    })(jQuery);
}

