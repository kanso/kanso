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
                'Action `' + k + '` is of type `' + typeof(action) + '`, ' +
                    "which this function doesn't know how to interpret"
            );
        }
        /* Resolve function description to actual function */
        rv[k] = exports.make_action_handler(module, callback, options);
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

exports.modalDialog = function (action_options, action_name,
                                type_name, field, path, value,
                                raw, errors, options, callback) {
    options = (options || {});
    action_options = (action_options || {});

    var widget = action_options.widget;
    var name = sanitize.generateDomName.apply(null, path);
    var path_extra = (options.path_extra || []).concat([ 'modal' ]);
    var widget_options = { path_extra: path_extra };

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
            ' use for the field named `' + path.join('.') + '`;' +
            ' widget or field type was not correctly specified'
        );
    }

    
    /* Generate strings for content */
    var cancel_label = 'Cancel';
    var type_label = utils.titleize(type_name);
    var action_label = utils.titleize(action_name);

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

    /* Handle success */
    ok_elt.click(function (ev) {

        /* Validate widget:
            This usually defers to a form type's implementation.
            Most simple widgets just return true for this method. */

        errors = widget.validate(div, path, widget_options);

        if (errors.length > 0) {

            /* Repost dialog box:
                This will replace the current dialog box.
                The modal dialog returns to the event loop before
                actually removing its elements, so we do the same. */

            $.modal.close();

            setTimeout(function () {
                exports.modalDialog(
                    action_options, action_name, type_name, field,
                        path, value, raw, errors, options, callback
                );
            }, 0);

        } else {

            /* Close the dialog box:
                Again, note that the dialog box won't actually disappear
                until we've unwound and returned to the main event
                loop. If you depend upon closure, use setTimeout(). */

            callback(
                true, widget.getValue(div, path, widget_options)
            );

            /* Order matters:
                The callback may refer to elements inside of the modal
                dialog, so don't destroy it until after it returns, and
                has had a chance to register any callbacks / timeouts. */

            $.modal.close();
        }

        ev.preventDefault();
    });

    /* Handle failure */
    cancel_elt.click(function () {
        callback(
            false, widget.getValue(div, path, widget_options)
        );
        $.modal.close();
    });

    /* Create widget's parent element */
    var div = $('<div />');

    /* Add dialog title */
    div.append(title_elt);

    /* Draw widget */
    div.append(
        widget.toHTML(
            name, value, raw, field, widget_options
        )
    );

    /* Find the form element:
        This is created by the call to widget.toHTML, above. */

    var form_elt = div.closestChild('form');

    if (form_elt.length <= 0) {

        /* No form element found?
            Generate one and wrap the contents of the dialog with
            it. This helps support widgets other than embedForm. */

        var wrapper_elt = $('<div />');
        form_elt = $('<form />');
        form_elt.append(div);
        wrapper_elt.append(form_elt);
        div = wrapper_elt;
    }

    /* Make default form action 'ok' */
    form_elt.submit(function (ev) {
        ev.preventDefault();
        ok_elt.click();
        return false;
    });

    /* Insert dialog-managed elements */
    actions_elt.append(ok_elt);
    actions_elt.append(cancel_elt);
    form_elt.append(actions_elt);

    /* Launch dialog */
    div.modal();

    /* Initialize widget:
        We do this last -- this makes sure all elements are present
        and initialized prior to client-side widget initialization. */

    widget.clientInit(
        field, path, value, raw, errors, widget_options
    );

};

