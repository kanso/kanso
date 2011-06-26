/*global $: false, kanso: true*/

var utils = require('./utils');

/**
 * Implementation of widget actions. These are procedures
 * that can be referenced by widgets to present/collect information,
 * manipulate the DOM, or otherwise affect the application state
 * when a widget is acted upon.
 *
 * @module
 */

/**
 * Module dependencies
 */

var widgets = require('./widgets'),
    sanitize = require('./sanitize'),
    _ = require('./underscore')._;

var h = sanitize.escapeHtml;

/**
 * Create a closure that loads {module}, and invokes {method}
 * on it. The {options} parameter is prepenced to the method's
 * argument list. This separate function silences a lint warning.
 * See the parse method for details.
 */
exports.make_action_handler = function (module, method, options) {
    return function () {
        var args = [ options ].concat(
            Array.prototype.slice.apply(arguments)
        );
        return require(module)[method].apply(null, args);
    };
};

/**
 * Convert an object containing several [ module, callback ] or
 * { module: x, callback: y } items in to an object containing
 * several native javascript functions, by using require.
 *
 * @param actions An object, containing items describing a
 *          function that can be obtained via require().
 */
exports.parse = function (actions) {
    var rv = {};
    for (var k in actions) {
        var module, callback, options;
        var action = actions[k];
        if (action === false) {
            rv[k] = utils.emptyFunction;
        } else {
            if (_.isArray(action)) {
                module = action[0];
                callback = action[1];
                options = action[2];
            } else if (_.isFunction(action)) {
                rv[k] = action;
                continue;
            } else if (typeof(action) === 'object') {
                module = action.module;
                callback = action.callback;
                options = action.options;
            } else {
                throw new Error(
                    'Action `' + k + '` is `' + typeof(action) + '`, ' +
                        "which this function doesn't know how to interpret"
                );
            }
            /* Resolve function description to actual function */
            rv[k] = exports.make_action_handler(module, callback, options);
        }
    }
    return rv;
};

/**
 * An action that produces a modal dialog box, with buttons along
 * its bottom. The contents of the dialog can be controlled by
 * setting either options.widget or options.type. If both are
 * specified, the widget will be used. If only type is specified,
 * this function transparently instansiates an embedForm widget,
 * which does the actual form rendering and presentation.
 */

exports.modalDialog = function (action_options,
                                names, data, options, callback) {
    options = (options || {});
    action_options = (action_options || {});

    var operation = 'update';
    var widget = action_options.widget;
    var name = sanitize.generateDomName(data.path);
    var path_extra = (options.path_extra || []).concat([ 'modal' ]);

    if (names.action !== 'edit') {
        operation = names.action;
    }
    var widget_options = {
        path_extra: path_extra,
        operation: operation
    };

    /* Resolve widget */
    if (!widget && action_options.type) {
        widget = widgets.embedForm(
            _.defaults(action_options.options || {}, {
                type: action_options.type
            })
        );
    }

    if (!widget) {
        throw new Error(
            'modalDialog: Unable to determine the widget to' +
            ' use for the field named `' + data.path.join('.') +
            '`; widget or field type was not correctly specified'
        );
    }

    /* Dialog setup and event handling:
        This is wrapped in a closure to allow it to easily be
        used inside both synchronous and asynchronous functions. */

    var generateModalDialog = function () {

        /* Generate strings for content */
        var cancel_label = 'Cancel';
        var type_label = utils.titleize(names.type);
        var action_label = utils.titleize(names.action);

        /* Generate inner elements */
        var title_elt = $(
            '<h2>' + [ action_label, type_label ].join(' ') + '</h2>'
        );
        var ok_elt = $(
            '<input type="submit" value="' + h(action_label) + '" />'
        );
        var cancel_elt = $(
            '<input type="button" value="' + h(cancel_label) + '" />'
        );
        var actions_elt = $(
            '<div class="actions" />'
        );

        /* Create widget's parent element */
        var div = $('<div class="dialog" />');

        /* Add dialog title */
        div.append(title_elt);

        /* Draw widget */
        div.append(
            widget.toHTML(
                name, data.value, data.raw, data.field, widget_options
            )
        );

        /* Find the form element:
            This is created by the call to widget.toHTML, above. */

        var form_elt = div.closestChild('form');

        if (form_elt.length <= 0) {

            /* No form element found?
                Generate one and wrap the contents of the dialog with it.
                This provides support for widgets other than embedForm. */

            var wrapper_elt = $('<div />');
            form_elt = $('<form />');
            form_elt.append(div);
            wrapper_elt.append(form_elt);
            div = wrapper_elt;
        }

        /* Insert elements:
            This is the panel of actions, including ok and cancel. */
        
        actions_elt.append(ok_elt);
        actions_elt.append(cancel_elt);
        form_elt.append(actions_elt);

        /* Insert elements:
            This is a progress indicator / spinner element. */
       
        var spinner_elt = $(
            '<div class="spinner" style="display: none;" />'
        );

        form_elt.append(spinner_elt);

        /* Event handler:
            Handle successful outcome. */

        ok_elt.click(function (ev) {

            /* Show progress indicator:
                This is deleted automatically when the dialog is closed. */

            spinner_elt.show();

            /* Validate widget:
                This usually defers to a form type's implementation.
                Most simple widgets just return true for this method. */

            data.errors =
                widget.validate(div, data.path, widget_options);

            if (data.errors.length > 0) {

                /* Repost dialog box:
                    This will replace the current dialog box.
                    The modal dialog returns to the event loop before
                    actually removing its elements, so we do the same. */

                $.modal.close();

                setTimeout(function () {
                    exports.modalDialog(
                        action_options, names, data, options, callback
                    );
                }, 0);

            } else {

                /* Invoke callback:
                    Let the widget that invoked us know that we're done. */

                callback(
                    true, widget.getValue(div, data.path, widget_options)
                );

                /* Order matters:
                    The callback may refer to elements inside of the modal
                    dialog, so don't destroy it until after it returns, and
                    has had a chance to register any callbacks / timeouts. */

                $.modal.close();
            }

            ev.preventDefault();
        });

        /* Event handler:
            Handle negative outcome, or cancellation. */

        cancel_elt.click(function () {
            callback(
                false, widget.getValue(div, data.path, widget_options)
            );
            $.modal.close();
        });

        /* Make default form action 'ok' */
        form_elt.submit(function (ev) {
            ev.preventDefault();
            ok_elt.click();
            return false;
        });

        /* Launch dialog:
            This wraps the <div> and inserts it in the DOM. */

        div.modal();

        /* Initialize widget:
            We do this last -- this makes sure all elements are present
            and initialized prior to client-side widget initialization. */

        widget.clientInit(
            data.field, data.path, data.value,
                data.raw, data.errors, widget_options
        );
    };

    return generateModalDialog();
};


/**
 * Update the action originator (i.e. a widget) with a new value.
 * 
 */
exports.defaultEmbedSave = function (action_options, names, 
                                     data, options, callback) {
    if (!data.element) {
        return callback(false, data.value);
    }

    var widget = utils.getPropertyPath(data, [ 'field', 'widget' ]);
    var item_elt = $(data.element).closest('.item');

    widget.setListItemValue(
        item_elt, data.value, options
    );

    return callback(true, data.value);
};

