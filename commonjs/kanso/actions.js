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
 * Convert an object containing several [ module, callback ] or
 * { module: x, callback: y } items in to an object containing
 * several native javascript functions, by using require.
 *
 * @param actions An object, containing items describing a
 *          function that can be obtained via require().
 */
exports.parse = function(actions) {
    var rv = {};
    for (var k in actions) {
        var module, callback, action = actions[k];
        if (_.isArray(action)) {
            module = action[0];
            callback = action[1];
            options = action[2];
        } else if (_.isFunction(action)) {
            rv[k] = action;
            continue;
        } else if (typeof(action) == 'object') {
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
        rv[k] = function () {
            var args = [ options ].concat(
                Array.prototype.slice.apply(arguments)
            );
            return require(module)[callback].apply(this, args);
        };
    }
    return rv;
}

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

    var widget_options = {
        offset: options.offset, path_extra: [ 'modal' ]
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
    div.append(
        widget.toHTML(
            name, value, raw, field, widget_options
        )
    );

    /* Register event handlers */
    okbtn.click(function () {
        $.modal.close();
        return callback(
            true, widget.getValue(div, path, widget_options)
        );
    });
    cancelbtn.click(function () {
        $.modal.close();
        return callback(
            false, widget.getValue(elt, path, widget_options)
        );
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

/**
 * Resizes a simplemodal control to match the dimensions of the
 * specified div.
 *
 * @name resizeModal(div)
 * @param {Element} The element from which to read width/height.
 * @api public
 */

exports.resizeModal = function (div) {
    $('#simplemodal-container').css({height: 'none', width: 'none'});
    $('#simplemodal-container').css({
        height: (div.height() + 20) + 'px',
        width: (div.width() + 40) + 'px'
    });
    $.modal.setPosition();
};




