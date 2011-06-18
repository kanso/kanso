/*global $: false, kanso: true*/

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

exports.modalDialog = function (action_options, type_name, field, path,
                                value, raw, errors, options, callback) {
    options = (options || {});
    action_options = (action_options || {});

    var div = $('<div />');
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

    /* Create elements for content */
    var okbtn = $(
        '<input type="button" value="' +
            h(raw ? 'Modify Item' : 'Add Item')  + '" />"'
    );
    var cancelbtn = $(
        '<input type="button" value="Cancel" />'
    );

    /* Draw widget */
    div.append(
        widget.toHTML(
            name, value, raw, field, widget_options
        )
    );

    okbtn.click(function () {

        /* Validate widget:
            This usually defers to a form type's implementation.
            Most simple widgets just return true for this method. */

        errors = widget.validate(div, path, widget_options);

        if (errors.length > 0) {

            /* Repost dialog box:
                This will replace the current dialog box. */

            $.modal.close();

            setTimeout(function () {
                exports.modalDialog(
                    action_options, type_name, field, path,
                        value, raw, errors, options, callback
                );
            }, 0);

        } else {

            /* Close the dialog box:
                Note that the dialog box won't actually disappear
                until we've unwound and returned to the main event
                loop. If you depend upon closure, use setTimeout(). */

            callback(
                true, widget.getValue(div, path, widget_options)
            );

            /* Order matters:
                The callback may refer to elements inside of the modal
                dialog, so don't destroy it until after it returns. */

            $.modal.close();
        }
    });

    cancelbtn.click(function () {
        callback(
            false, widget.getValue(div, path, widget_options)
        );
        $.modal.close();
    });

    div.submit(function (ev) {
        ev.preventDefault();
        okbtn.click();
        return false;
    });

    div.append(okbtn);
    div.append(cancelbtn);

    /* Launch */
    div.modal();

    /* Initialize widget */
    widget.clientInit(
        field, path, value, raw, errors, widget_options
    );

};

