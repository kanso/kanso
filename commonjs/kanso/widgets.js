/*global $: false, kanso: true*/

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
    forms = require('./forms'),
    actions = require('./actions'),
    render = require('./render'),
    sanitize = require('./sanitize'),
    utils = require('./utils'),
    events = require('./events'),
    querystring = require('./querystring'),
    _ = require('./underscore')._;

var h = sanitize.escapeHtml,
    css = sanitize.escapeAttributeSelectorValue;


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
        This function needs to actually check type_name. */

    var rv = null;

    try {
        rv = JSON.parse(str);
    } catch (e) {
        rv = str;
    }

    return rv;
};

/**
 * Converts an in-memory representation of the document or
 * document fragment in to an encoded string. If the value
 * passed is already encoded, this function does nothing.
 *
 * @name _stringify_value(str, type_name)
 * @param {String} value The value to encode.
 * @param {String} type_name The type of field that the input control
 *          belongs to. This value may influence how value is encoded.
 * @returns {Object}
 */

Widget.prototype._stringify_value = function (value, type_name)
{
    /* TODO:
        This function needs to actually check type_name. */

    var rv = null;

    try {
        rv = JSON.stringify(value);
    } catch (e) {
        rv = value;
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
    html += ' name="' + this._name(name, options.offset) + '" id="';
    html += this._id(name, options.offset, options.path_extra) + '"';
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
    e.attr('id', this._id(path, options.offset, options.path_extra));
    e.attr('name', this._name(path, options.offset, options.path_extra));
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
    elt = $(elt).closestChild('input[type=hidden]');
    elt.val(this._stringify_value(value));
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
    return this._parse_value(
        $(elt).closestChild('input[type=hidden]').val()
    );
};

/**
 * Called by Kanso when it becomes necessary to validate the
 * contents of this widget -- i.e. to ensure it's in a consistent
 * state before using its value or proceeding. Most widgets will
 * not implement this method; its primary use is complex widgets
 * that host validation-enabled forms and/or types. Returns true
 * if the contents is consistent and valid; false otherwise.
 *
 * @name Widget.validate(elt, path, options)
 * @param {String} elt An element that contains one or
 *          more instances of the widget referenced by `this'.
 * @param {String} path The path to the widget.
 * @param {Object} options An up-to-date set of toHTML/clientInit options.
 * @api public
 */

Widget.prototype.validate = function (elt, path, options) {
    return true;
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

exports.textarea = function (_options) {
    var w = new Widget('textarea', _options || {});
    w.options = _options;
    w.toHTML = function (name, value, raw, field, options) {
        if (raw === undefined) {
            raw = (value === undefined) ? '': '' + value;
        }
        if (raw === null || raw === undefined) {
            raw = '';
        }
        var html = '<textarea';
        html += ' name="' + this._name(name, options.offset) + '" id="';
        html += this._id(name, options.offset, options.path_extra) + '"';

        if (this.options.hasOwnProperty('cols')) {
            html += ' cols="' + h(this.options.cols) + '"';
        }
        if (this.options.hasOwnProperty('rows')) {
            html += ' rows="' + h(this.options.rows) + '"';
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

exports.checkbox = function (_options) {
    var w = new Widget('checkbox', _options || {});
    w.toHTML = function (name, value, raw, field, options) {
        var html = '<input type="checkbox"';
        html += ' name="' + this._name(name, options.offset) + '" id="';
        html += this._id(name, options.offset, options.path_extra) + '"';
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

exports.select = function (_options) {
    var w = new Widget('select', _options || {});
    w.values = _options.values;
    w.toHTML = function (name, value, raw, field, options) {
        if (value === null || value === undefined) {
            value = '';
        }

        var html = '<select';
        html += ' name="' + this._name(name, options.offset) + '" id="';
        html += this._id(name, options.offset, options.path_extra) + '">';

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

exports.computed = function (_options) {
    var w = new Widget('computed', _options);
    w.toHTML = function (name, value, raw, field, options) {
        if (raw === undefined) {
            raw = (value === undefined) ? '': '' + value;
        }
        if (raw === null || raw === undefined) {
            raw = '';
        }
        var html = '<div id="';
        html += this._id(name, options.offset, options.path_extra) + '">';
        html += '<input type="hidden" value="' + h(raw) + '"';
        html += ' name="' + this._name(name, options.offset) + '" />';
        html += '<span>' + h(raw) + '</span>';
        html += '</div>';
        return html;
    };
    return w;
};

/**
 * Creates a new computed input widget which sets the value of the field to
 * the current user on new documents, responding to sessionChange events
 *
 * @name creator([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.creator = function (options) {
    var w = exports.computed(options);
    var _toHTML = w.toHTML;
    var el_name; // store input name provided by renderer
    var el; // store reference to element so we can detect when its been removed

    w.toHTML = function (name/*, ...*/) {
        el_name = name;
        return _toHTML.apply(this, arguments);
    };
    w.clientInit = function (field, path, value, raw, errors, options) {
        if (options.operation === 'add') {

            var id = w._id(el_name, options.offset, options.path_extra);

            // store reference to container element
            el = $('#' + id)[0];

            var update_val = function (userCtx, req) {
                var container = $('#' + id)[0];
                if (el !== container) {
                    // element has been removed
                    events.removeListener('sessionChange', update_val);
                    return;
                }
                if (container) {
                    $('input', container).val(userCtx.name || '');
                    $('span', container).text(userCtx.name || '');
                }
                else {
                    // element has been removed from page (or was never there?)
                    events.removeListener('sessionChange', update_val);
                }
            };
            events.on('sessionChange', update_val);
        }
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
    w.widget = (_options.widget || exports.defaultEmbedded());
    w.actions = actions.parse(_options.actions || {});

    w.toHTML = function (name, value, raw, field, options) {

        this.cacheInit();
        value = this.normalizeValue(value);

        this.field = field;
        this.render_options = (options || {});

        var id = this._id(
            name, 'list', this.render_options.offset,
                this.render_options.path_extra
        );
        var html = (
            '<div class="embed-list" rel="' +
                h(this.field.type.name) + '" id="' + h(id) + '">'
        );

        value = (value instanceof Array ? value : []);
        html += '<div class="items" rel="' + h(name) + '">';

        for (var i = 0, len = value.length; i < len; ++i) {
            html += this.htmlForListItem({
                offset: (this.singleton ? null : i),
                name: name,
                value: value[i],
                raw: raw
            });
        }
        html += (
                '</div>' +
                '<div class="actions">' +
                    this.htmlForAddButton() +
                '</div>' +
            '</div>'
        );
        return html;
    };

    w.clientInit = function (field, path, value, raw, errors, options) {

        this.cacheInit();
        value = this.normalizeValue(value);

        this.path = path;
        this.field = field;
        this.render_options = (options || {});

        var item_elts = (
            this.discoverListItemsElement().children('.item')
        );

        for (var i = 0, len = item_elts.length; i < len; ++i) {
            this.bindEventsForListItem(item_elts[i]);

            if (_.isFunction(this.widget.clientInit)) {
                this.widget.clientInit(
                    this.field, this.path, value[i], value[i], [], {
                        offset: (this.singleton ? null : i)
                    }
                );
            }
        }

        this.renumberList();
        this.bindEventsForList();
    };

    /** private: **/

    w.cacheInit = function () {
        this.discoverListElement = _.memoize(this._discoverListElement);
        this.discoverListName = _.memoize(this._discoverListName);
        this.discoverListType = _.memoize(this._discoverListType);
        this.discoverListItemsElement =
            _.memoize(this._discoverListItemsElement);
    };

    w.normalizeValue = function (value) {
        if (this.singleton) {
            if (value && !_.isArray(value)) {
                value = [ value ];
            }
        }
        return value;
    };

    w._discoverListElement = function () {
        return $('#' + this._id(
            this.path, 'list', this.render_options.offset,
                this.render_options.path_extra
        ));
    };

    w._discoverListName = function () {
        var list_elt = this.discoverListElement();
        var actions_elt = $(list_elt).closestChild('.actions');
        return actions_elt.attr('rel');
    };
    
    w._discoverListType = function () {
        var list_elt = this.discoverListElement();
        return list_elt.attr('rel');
    };

    w._discoverListItemsElement = function () {
        var list_elt = this.discoverListElement();
        return list_elt.closestChild('.items');
    };

    w.discoverListItems = function () {
        return (
            this.discoverListItemsElement().children('.item')
        );
    };

    w.countListItems = function () {
        return this.discoverListItems().length;
    };

    w.bindEventsForList = function () {
        var list_elt = this.discoverListElement();
        var add_elt = $(list_elt).closestChild('.actions .add');

        add_elt.bind('click', utils.bindContext(this, function (ev) {
            return this.handleAddButtonClick(ev);
        }));
    };

    w.bindEventsForListItem = function (item_elt) {
        item_elt = $(item_elt);
        var edit_elt = item_elt.closestChild('.actions .edit');
        var delete_elt = item_elt.closestChild('.actions .delete');

        edit_elt.bind('click', utils.bindContext(this, function (ev) {
            return this.handleEditButtonClick(ev);
        }));

        delete_elt.bind('click', utils.bindContext(this, function (ev) {
            return this.handleDeleteButtonClick(ev);
        }));

        if (this.sortable) {
            var up_elt = item_elt.closestChild('.actions .up');
            var down_elt = item_elt.closestChild('.actions .down');

            up_elt.bind('click', utils.bindContext(this, function (ev) {
                return this.handleUpButtonClick(ev);
            }));

            down_elt.bind('click', utils.bindContext(this, function (ev) {
                return this.handleDownButtonClick(ev);
            }));
        }
    };

    w.renumberList = function () {
        var item_elts =
            this.discoverListItemsElement().children('.item');

        for (var i = 0, len = item_elts.length; i < len; ++i) {
            var item = $(item_elts[i]);
            this.renumberListItem(item, i);
            this.updateListItemActions(item, i, len);

        }
        return this.updateListActions(len);
    };

    w.renumberListItem = function (elt, offset) {
        var widget_options = {
            offset: (this.singleton ? null : offset)
        };
        if (_.isFunction(this.widget.updateName)) {
            this.widget.updateName(elt, this.path, widget_options);
        }
    };

    w.updateListActions = function (offset) {
        var list_elt = this.discoverListElement();
        var add_elt = list_elt.closestChild('.actions .add');

        if (this.singleton && offset > 0) {
            add_elt.hide();
        } else {
            add_elt.show();
        }
        return offset;
    };

    w.updateListItemActions = function (item_elt, offset, count) {
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

    w.moveExistingItem = function (after_elt, item_elt) {
        if (after_elt) {
            $(after_elt).after(item_elt);
        } else {
            var items_elt = this.discoverListItemsElement();
            items_elt.append(item_elt);
        }
        this.renumberList();
        this.bindEventsForListItem(item_elt);
    };

    w.deleteExistingItem = function (item_elt) {
        $(item_elt).remove();
        this.renumberList();
    };

    w.insertNewItemAtEnd = function (callback) {
        var list_elt = this.discoverListElement();

        var item_elts =
            this.discoverListItemsElement().children('.item');

        var last_elt = item_elts.last();

        return this.insertNewItem(
            (this.singleton ? null : item_elts.length),
                last_elt[0], callback
        );
    };

    w.insertNewItem = function (offset, after_elt, callback) {
        var list_elt = this.discoverListElement();
        var list_type = this.discoverListType();

        db.newUUID(100, utils.bindContext(this, function (err, uuid) {
            var value = { type: list_type, _id: uuid };

            var item_elt = $(this.htmlForListItem({
                name: this._name(this.path),
                offset: offset,
                value: value,
                raw: value
            }));

            this.moveExistingItem(after_elt, item_elt);

            if (_.isFunction(this.widget.clientInit)) {
                this.widget.clientInit(
                    this.field, this.path, value, null, [], {
                        offset: (this.singleton ? null : offset)
                    }
                );
            }

            if (callback) {
                callback(item_elt[0]);
            }
        }));
    };

    w.setListItemValue = function (item_elt, value, options) {
        if (this.widget.updateValue) {
            this.widget.updateValue(
                item_elt, this.path, value, options
            );
        }
    };

    w.htmlForListItem = function (item) {
        var html = (
            '<div class="item">' +
                '<div class="actions">' +
                    (this.sortable ? this.htmlForDownButton() : '') +
                    (this.sortable ? this.htmlForUpButton() : '') +
                    this.htmlForEditButton() +
                    this.htmlForDeleteButton() +
                '</div>' +
                this.widget.toHTML(
                    item.name, item.value, item.raw, this.field,
                        { offset: item.offset }
                ) +
            '</div>'
        );
        return html;
    };

    w.htmlForAddButton = function () {
        return (
            '<input type="button" class="add action" value="Add" />'
        );
    };

    w.htmlForEditButton = function () {
        return (
            '<input type="button" class="edit action" value="Edit" />'
        );
    };

    w.htmlForDeleteButton = function () {
        return (
            '<input type="button" class="delete action" value="Delete" />'
        );
    };

    w.htmlForUpButton = function () {
        return (
            '<input type="button" class="up action" value="&uarr;" />'
        );
    };

    w.htmlForDownButton = function () {
        return (
            '<input type="button" class="down action" value="&darr;" />'
        );
    };

    w.dispatchEventToAction = function (target_elt, action_name,
                                        value_for_action, callback) {

        var name = this._name(this.path);
        var type_name = this.discoverListType();
        var item_elt = $(target_elt).closest('.item');
        var offset = item_elt.prevAll('.item').length;

        var widget_options = {
            offset: offset,
            path_extra: (this.render_options.path_extra || [])
        };

        if (value_for_action === undefined) {

            /* Action has no payload:
                Query the widget for its current value, and use that. */

            value_for_action = this.widget.getValue(
                item_elt, this.path, this.render_options
            );
        }

        if (!value_for_action) {
            return callback(
                this, target_elt, widget_options, false, undefined
            );
        }

        /* Grab closure for action */
        var action_handler = (
            this.actions[action_name] ||
                this.defaultActionFor(action_name)
        );

        /* Create a completion callback:
            The action handler will transfer control here when finished. */

        var cb = utils.bindContext(this,
            function (successful, new_value) {
                if (callback) {
                    callback.call(
                        this, target_elt,
                            widget_options, successful, new_value
                    );
                }
            }
        );

        /* Trigger action */
        if (action_handler) {
            action_handler(
                { action: action_name, type: type_name },

                { element: target_elt, raw: null,
                  field: this.field, path: this.path,
                  value: value_for_action, errors: [] },
                
                widget_options, cb
            );
        }
    };

    w.handleUpButtonClick = function (ev) {
        var item_elt = $(ev.target).closest('.item');
        item_elt.insertBefore(item_elt.prev('.item'));
        this.renumberList();
    };

    w.handleDownButtonClick = function (ev) {
        var item_elt = $(ev.target).closest('.item');
        item_elt.insertAfter(item_elt.next('.item'));
        this.renumberList();
    };

    w.handleAddButtonClick = function (ev) {
        var callback = utils.bindContext(
            this, this.handleAddCompletion
        );
        this.insertNewItemAtEnd(
            utils.bindContext(this, function (item_elt) {
                this.dispatchEventToAction(
                    item_elt, 'add', undefined, callback
                );
            })
        );
    };

    w.handleEditButtonClick = function (ev) {
        var callback = utils.bindContext(
            this, this.handleEditCompletion
        );

        this.dispatchEventToAction(
            ev.target, 'edit', undefined, callback
        );
    };

    w.handleDeleteButtonClick = function (ev) {
        var callback = utils.bindContext(
            this, this.handleDeleteCompletion
        );

        this.deleteExistingItem(
            $(ev.target).closest('.item', this)
        );

        this.dispatchEventToAction(
            ev, 'delete', undefined, callback
        );
    };

    w.handleAddCompletion = function (target_elt, offset,
                                      is_successful, new_value) {
        var item_elt =
            $(target_elt).closest('.item', this);

        if (is_successful) {
            var callback = utils.bindContext(
                this, this.handleSaveCompletion
            );
            this.dispatchEventToAction(
                item_elt, 'save', new_value, callback
            );
        } else {
            this.deleteExistingItem(item_elt);
        }
    };

    w.handleEditCompletion = function (target_elt, options,
                                       is_successful, new_value) {
        if (is_successful) {

            var callback = utils.bindContext(
                this, this.handleSaveCompletion
            );
            this.dispatchEventToAction(
                target_elt, 'save', new_value, callback
            );

        } else {

            /* Edit action was unsuccessful:
                This means the edit was canceled or otherwise aborted,
                and no changes should be made to the underlying data. */

            return this;
        }
    };

    w.handleDeleteCompletion = function (target_elt, options,
                                         is_successful, new_value) {
        return;
    };

    w.handleSaveCompletion = function (target_elt, options,
                                       is_successful, new_value) {
        return;
    };

    w.defaultActionFor = function (name) {

        switch (name) {
        case 'add':
        case 'edit':
            return this.makeDefaultAction('modalDialog', {
                widget: exports.embedForm({
                    type: this.field.type
                })
            });
            /* break */
        case 'save':
            return this.makeDefaultAction('defaultEmbedSave', {});
            /* break */
        case 'delete':
            break;
        }
        return null;
    };

    w.makeDefaultAction = function (name, options) {
        return utils.bindContext(this, function () {
            actions[name].apply(
                this, [ options ].concat(
                    Array.prototype.slice.apply(arguments)
                )
            );
        });
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
        var fval = (value ? this._stringify_value(value) : '');

        if (field && field.type.display_name && value) {
            display_name = field.type.display_name(value);
        }
        var html = (
            '<div class="default-embed">' +
                '<input type="hidden" value="' + h(fval) + '" name="' +
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
    w.options = (_options || {});

    w.toHTML = function (name, value, raw, field, options) {

        this.cacheInit();
        this.field = field;
        this.render_options = (options || {});

        var id = this._id(
            name, 'form', this.render_options.offset,
                this.render_options.path_extra
        );

        this.is_reference = _.include(
            [ 'reference', 'unique_reference' ], this.field.type.name
        );

        if (this.is_reference && !this.options.noDereference) {

            /* Start progress indicator:
                We might be running server-side; show a progress indicator
                until we're able to make the XHR request in clientInit. */

            this.type = utils.getPropertyPath(field, [ 'type', 'type' ]);

            return (
                '<div id="' + id + '" class="embedded form">' +
                    '<div class="spinner" />' +
                '</div>'
            );
        } else {

            /* Not a reference type:
                Go ahead and render the full form synchronously. */

            this.type = this.options.type;

            return (
                '<div id="' + id + '" class="embedded form">' +
                    '<form>' +
                        this.renderEmbedded(value) +
                    '</form>' +
                '</div>'
            );
        }
    };

    w.clientInit = function (field, path, value, raw, errors, options) {

        this.cacheInit();
        this.field = field;
        this.render_options = (options || {});

        if (this.is_reference) {

            /* Dereference document:
                Since we were provided with a reference type, we
                need to use the reference's ref or id attribute to
                look up the actual value to be used while rendering
                the form. This has to be asynchronous, so we do it here. */

            var document_id = (value.ref || value._id);

            db.getDoc(
                document_id,
                utils.bindContext(this, function (err, rv) {
                    if (err) {
                        throw new Error(
                            'Unable to locate the identifier `' +
                                document_id + '`, referenced from the' +
                                ' reference document `' + value._id + '`'
                        );
                    }

                    /* Render form:
                        The enclosing div already exists; include the form
                        element, since we're replacing the whole contents. */

                    var container_elt = this.discoverContainerElement(path);
                    $(container_elt).html(
                        this.renderEmbedded(rv)
                    );

                    /* Resize modalDialog:
                        Force the CSS width/height to unrestricted values,
                        then let the simplemodal code recompute its position
                        and dimensions. This code belongs in modalDialog. */

                    $('.simplemodal-container').width('auto');
                    $('.simplemodal-container').height('auto');

                    $.modal.setPosition();
                    $.modal.setContainerDimensions();
                })
            );
        }
    };

    w.getValue = function (elt, path, options) {
        var container_elt = this._discoverContainerElement(path);
        var form_elt = container_elt.closestChild('form');
        var rv = querystring.parse(
            form_elt.serialize().replace(/\+/g, '%20')
        );
        return rv;
    };

    w.validate = function (elt, path, options) {
        this.form.validate({
            form: this.getValue(elt, path, options),
            userCtx: utils.currentRequest().userCtx
        });
        return this.form.errors;
    };

    /** private: **/

    w.cacheInit = function () {
        this.discoverContainerElement = this._discoverContainerElement;
    };

    w._discoverContainerElement = function (path) {
        var id = this._id(
            path, 'form', this.render_options.offset,
                this.render_options.path_extra
        );
        return $('#' + id);
    };

    w.renderEmbedded = function (value) {

        this.form = new forms.Form(this.type);
        this.form.values = value;

        var html = (
            '<form>' +
            this.form.toHTML(
                null, render.defaultRenderer(),
                    this.render_options, true /* create defaults */
            ) +
            '</form>'
        );

        return html;
    };

    return w;
};

/**
 * Creates a new document selector widget. This widget allows the
 * user to select a document from a CouchDB view (specified in options).
 * The options available for this widget are explained briefly below:
 *
 * <table class="options">
 *   <tr>
 *      <td class="name">viewName</td>
 *      <td class="type">String</td>
 *      <td class="description">
 *          The name of the CouchDB view that you'd like to select
 *          documents from. If this option is not specified, it will
 *          look for a view with the same name as this widget's field.
 *      </td>
 *   </tr>
 *   <tr>
 *      <td class="name">db</td>
 *      <td class="type">String</td>
 *      <td class="description">
 *          The CouchDB database containing the view for this widget. If
 *          this option is not specified, the current database will be used.
 *      </td>
 *   </tr>
 *   <tr>
 *      <td class="name">useJSON</td>
 *      <td class="type">String</td>
 *      <td class="description">
 *          Set this option to false if this widget should yield a string
 *          containing a single document id. Set this option to true (the
 *          default) to yield a JSON string.
 *      </td>
 *   </tr>
 *   <tr>
 *      <td class="name">storeEntireDocument</td>
 *      <td class="type">String</td>
 *      <td class="description">
 *          Set this option to false if this widget should yield *only*
 *          a document identifier, effectively storing a reference to a
 *          document. Set this option to true (the default) to include
 *          all fields from the selected document. If useJSON is false,
 *          then this option is ignored and treated as if it were false.
 *      </td>
 *   </tr>
 * </table>
 *
 * @constructor
 * @param options
 */

exports.documentSelector = function (_options) {
    var w = new Widget('documentSelector', _options);

    w.options = _.defaults(_options || {}, {
        useJSON: true,
        storeEntireDocument: true
    });

    w.toHTML = function (name, value, raw, field, options) {
        this.cacheInit();
        var html_name = this._name(
            name, options.offset
        );
        var container_id = this._id(
            name, 'widget', options.offset, options.path_extra
        );
        var select_id = this._id(
            name, options.offset, options.path_extra
        );
        var select_html = (
            '<select class="document-selector" id="' + select_id +
                '" name="' + html_name + '" />'
        );
        var html = (
            '<div id="' + container_id + '"' +
                ' class="document-selector widget">' +
                select_html +
                '<div class="spinner" style="display: none;" />' +
            '</div>'
        );

        return html;
    };

    w.updateName = function (elt, path, options) {
        this.cacheInit();
        var select_elt = this.discoverSelectionElement(elt);

        select_elt.attr('id', this._id(
            path, options.offset, options.path_extra
        ));
        select_elt.attr('name', this._name(
            path, options.offset
        ));
    };

    w.updateValue = function (elt, path, value, options) {
        var new_value = value;
        var select_elt = this.discoverSelectionElement(elt);

        if (this.options.useJSON) {
            new_value = this._stringify_value(new_value);
        }

        /* Update <select> element contents, if necessary:
            If we're embedding the whole document as JSON, then
            we need to modify the <option> affected by an edit. This 
            ensures that the previously-selected item remains selected. */
            
        if (this.options.storeEntireDocument && this.options.useJSON) {
            if (value && value._id) {
                var selector = 'option[rel="' + css(value._id) + '"]';
                var option_elt = $(selector, select_elt);
                option_elt.val(new_value);
            }
        }

        select_elt.val(new_value);
    };

    w.getValue = function (elt, path, options) {
        var select_elt = this.discoverSelectionElement(elt);
        return this._parse_value(select_elt.val());
    };

    w.clientInit = function (field, path, value, raw, errors, options) {
        var id = this._id(
            path, 'widget', options.offset, options.path_extra
        );
        var container_elt = $('#' + id);
        var widget_options = (this.options || {});
        var spinner_elt = container_elt.closestChild('.spinner');
        var select_elt = this.discoverSelectionElement(container_elt);

        /* Start progress */
        spinner_elt.show();
        this.populateSelectElement(
            container_elt, field, path, value, widget_options, function () {
                spinner_elt.hide();
            }
        );
    };

    /** private: **/

    w.populateSelectElement = function (container_elt, field,
                                        path, val, options, callback) {
        var select_elt =
            this.discoverSelectionElement(container_elt);

        db.getView(
            options.viewName,
            { include_docs: options.storeEntireDocument },
            { db: options.db },
            utils.bindContext(this, function (err, rv) {
                /* Error handling */
                if (err) {
                    throw new Error(
                        'Failed to request content from view `' +
                            options.viewName + '`'
                    );
                }
                /* Option element for 'no selection' */
                var nil_option = $('<option />');
                if (!val) {
                    nil_option.attr('selected', 'selected');
                }
                select_elt.append(nil_option);

                /* All other option elements */
                _.each(rv.rows || [], utils.bindContext(this, function (r) {
                    var option_elt = $('<option />');

                    if (this.isOptionSelected(r, val, options)) {
                        option_elt.attr('selected', 'selected');
                    }
                    this.generateOptionValue(
                        field, r, val, options,
                        utils.bindContext(this, function (err, v) {
                            /* Problem with UUID generation? */
                            if (err) {
                                throw new Error(
                                    'Failed to generate identifier for' +
                                        ' field `' + this._name(path) + '`'
                                );
                            }

                            /* Insert new <option> */
                            option_elt.val(v);
                            option_elt.text(r.value);
                            option_elt.attr('rel', r.id);
                            select_elt.append(option_elt);

                            /* Sync with <select> element */
                            this.updateValue(
                                container_elt, path, val, options
                            );
                        })
                    );

                }));
                callback();
            })
        );
    };

    w.isOptionSelected = function (row, value, options) {
        if (options.useJSON) {
            if (options.storeEntireDocument || options.unique) {
                return ((value || {})._id === row.id);
            } else {
                return ((value || {}).ref === row.id);
            }
        } else {
            return (value === row.id);
        }
    };

    w.generateOptionValue = function (field, row, value, options, callback) {
        if (options.useJSON) {
            if (options.storeEntireDocument) {

                /* Embed actual document:
                    Duplicates are automatically disallowed. */

                callback(false, JSON.stringify(row.doc));

            } else if (options.unique) {

                /* Reference, duplicates disallowed:
                    Store id inside of _id attribute. */

                callback(false, JSON.stringify({
                    _id: row.id,
                    type: field.type.name
                }));

            } else {

                /* Reference, duplicates allowed:
                    Store id inside of the ref attribute, and generate
                    a new UUID for the _id attribute if it's necessary. */

                var return_value = function (uuid) {
                    callback(false, JSON.stringify({
                        _id: uuid,
                        ref: row.id,
                        type: field.type.name
                    }));
                };

                var forward_error = function (err) {
                    callback(err, null);
                };

                if (value && value._id) {
                    return_value(value._id);
                } else {
                    db.newUUID(100, function (err, uuid) {
                        if (err) {
                            forward_error(err);
                        } else {
                            return_value(uuid);
                        }
                    });
                }
            }
        } else {

            /* Not using JSON:
                The type is a scalar; just use the _id. */

            callback(false, row.id);
        }

        return this;
    };

    w.cacheInit = function () {
        this.discoverSelectionElement = this._discoverSelectionElement;
    };

    w._discoverSelectionElement = function (container_elt) {
        return $(container_elt).closestChild('select.document-selector');
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
    (function ($) {
        $.fn.closestChild = function (selector) {
            /* Breadth-first search for the first matched node */
            if (selector && selector !== '') {
                var queue = [];
                queue.push(this);
                while (queue.length > 0) {
                    var node = queue.shift();
                    var children = node.children();
                    for (var i = 0; i < children.length; ++i) {
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
    }($));
}

