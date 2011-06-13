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
    sanitize = require('./sanitize'),
    _ = require('./underscore')._,
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
    html += (this.type ? ' type="' + h(this.type) + '"': '');
    html += ' value="' + h(raw) + '"';
    html += this._attrs(name);
    return html + ' />';
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

exports.embedList = function (options) {
    var w = new Widget('embedList', options);

    w.actions = options.actions;
    w.singleton = options.singleton;
    w.widget = (options.widget || exports.defaultEmbedded());

    w.toHTML = function (name, value, raw, field) {
        var id = this._id(name, 'list');
        var html = (
            '<div class="embedlist" rel="' +
                h(field.type.name) + '" id="' + h(id) + '">'
        );

        value = (value instanceof Array ? value : []);
        html += '<div class="items" rel="' + h(name) + '">';

        for (var i = 0, len = value.length; i < len; ++i) { 
            html += this.htmlForListItem(field, {
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

    w.clientInit = function(field, path, value, raw, errors, offset) {
        var list_elt = this.discoverListElement(path);
        var item_elts = list_elt.closestChild('.items').children('.item');

        for (var i = 0, len = item_elts.length; i < len; ++i) {
            this.bindEventsForListItem(field, path, item_elts[i]);

            if (this.widget.clientInit) {
                this.widget.clientInit(
                    field, path, value[i], value[i], [], i
                );
            }
        }
        
        this.bindEventsForList(field, path);
    };

    /** private: **/

    w.discoverListElement = function(list_name_or_path) {
        var name = (
            list_name_or_path instanceof Array ?
                list_name_or_path.join('.') : list_name_or_path
        );
        return $('#' + this._id(name, 'list'));
    };

    w.discoverListName = function (list_elt) {
        var actions_elt = $(list_elt).closestChild('.');
        return actions_elt.attr('rel');
    };

    w.discoverListType = function (list_elt) {
        return list_elt.attr('rel');
    };

    w.bindEventsForList = function(field, path) {
        var list_elt = this.discoverListElement(path);
        var add_elt = $(list_elt).closestChild('.actions > .add');

        add_elt.bind('click', utils.bindContext(this, function (ev) {
            return this.handleAddButtonClick(ev, field, path);
        }));
    };

    w.bindEventsForListItem = function (field, path, item_elt) {
        var edit_elt = $(item_elt).closestChild('.actions > .edit');
        var delete_elt = $(item_elt).closestChild('.actions > .delete');

        edit_elt.bind('click', utils.bindContext(this, function(ev) {
            return this.handleEditButtonClick(ev, field, path);
        }));

        delete_elt.bind('click', utils.bindContext(this, function(ev) {
            return this.handleDeleteButtonClick(ev, field, path);
        }));
    };

    w.renumberList = function (path) {
        var list_elt = this.discoverListElement(path);
        var item_elts = list_elt.closestChild('.items').children('.item');

        for (var i = 0, len = item_elts.length; i < len; ++i) {
            this.renumberItem(item_elts[i], path, i);
        };

        var add_elt = list_elt.closestChild('.actions > .add');

        if (this.singleton && i > 0) {
            add_elt.hide();
        } else {
            add_elt.show();
        }

        return i;
    };

    w.renumberItem = function (elt, path, offset) {
        var input_elt = $(elt).closestChild('input[type=hidden]');
        var name = path.join('.');
        input_elt.attr(
            'name', this._name(name, (this.singleton ? null : offset))
        );
    }

    w.insertItemAtEnd = function (field, path) {
        var list_elt = this.discoverListElement(path);
        var item_elts =  list_elt.closestChild('.items').children('.item');
        var last_elt = item_elts.last();
        this.insertItem(
            field, path,
            (this.singleton ? null : item_elts.length),
            last_elt[0]
        );
    };

    w.insertItem = function(field, path, offset, after_elt) {
        var list_elt = this.discoverListElement(path);
        var items_elt = list_elt.closestChild('.items');
        var list_type = this.discoverListType(list_elt);

        db.newUUID(100, utils.bindContext(this, function (err, uuid) {
            var value = { type: list_type, _id: uuid };

            var item_elt = $(this.htmlForListItem(field, {
                name: path.join('.'),
                offset: offset, value: value, raw: value
            }));

            if (after_elt) {
                $(after_elt).after(item_elt);
            } else {
                items_elt.append(item_elt);
            }

            this.renumberList(path);
            this.bindEventsForListItem(field, path, item_elt);

            if (this.widget.clientInit) {
                this.widget.clientInit(
                    field, path, value, value, [], offset
                );
            }
        }))
    };

    w.htmlForListItem = function(field, item) {
        var html = (
            '<div class="item">' +
                '<div class="actions">' +
                    this.htmlForEditButton() +
                    this.htmlForDeleteButton() +
                '</div>' +
                this.widget.toHTML(
                    item.name, item.value, item.raw, field, item.offset
                ) +
            '</div>'
        );
        return html;
    };

    w.htmlForAddButton = function() {
        return (
            '<input type="button" class="add" value="Add" />'
        );
    };

    w.htmlForEditButton = function() {
        return (
            '<input type="button" class="edit" value="Edit" />'
        );
    };

    w.htmlForDeleteButton = function() {
        return (
            '<input type="button" class="delete" value="Delete" />'
        );
    };

    w.handleAddButtonClick = function (ev, field, path) {
        this.insertItemAtEnd(field, path);
    };

    w.handleEditButtonClick = function (ev, field, path) {
    };

    w.handleDeleteButtonClick = function (ev, field, path) {
        var list_elt = this.discoverListElement(path);
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
 * @name embedded([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.defaultEmbedded = function (options) {
    var w = new Widget('defaultEmbedded', options);
    w.toHTML = function (name, value, raw, field, offset) {
        var display_name = (value ? value._id: '');
        var fval = (value ? utils.escapeHTML(JSON.stringify(value)) : '');

        if (field && field.type.display_name && value) {
            display_name = field.type.display_name(value);
        }
        var html = (
            '<div class="embed">' + 
                '<input type="hidden" value="' + fval + '" name="' +
                    h(this._name(name, offset)) + '" />' +
                '<span class="value">' + h(display_name) + '</span>' +
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

exports.documentSelector = function (options) {
    var w = new Widget('documentSelector', options);
    w.toHTML = function (name, value, raw, field, offset) {
        var html_value = (
            value instanceof Object ?
                JSON.stringify(value) : value
        );
        var input_html = (
            '<input class="backing"' +
                ' type="hidden" value="' + h(html_value) +
                '" ' + this._attrs(name, offset) + ' />'
        );
        var select_html = (
            '<select class="selector"' +
                ' id="' + h(this._id(name, 'visible', offset)) + '"' +
            '></select>'
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
    w.clientInit = function(field, path, value, raw, errors, offset) {
        var name = path.join('.');
        var container_elt = $('#' + this._id(name, offset)).parent();
        var hidden_elt = (
            container_elt.closestChild('input[type=hidden].backing')
        );
        var select_elt = container_elt.closestChild('.selector');
        var spinner_elt = container_elt.closestChild('.spinner');
        var options = (this.options || {});
        var is_embedded = (value instanceof Object);

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

