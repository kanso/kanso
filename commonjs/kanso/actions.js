
var widgets = require('./widgets'),
    _ = require('./underscore')._;


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
        } else if (action instanceof Object) {
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
            require(module)[callback].apply(
                null, [ options ].concat(arguments)
            );
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

exports.modalDialog = function (options, field, path,
                                value, raw, errors, offset) {
    options = $(options || {});

    var div = $('<div />');
    var widget = (options.widget || {});

    if (!widget && options.type) {
        widget = widgets.embedForm(
            _.defaults(options.options || {}, {
                type: options.type
            })
        );
    }
    if (!widget) {
        throw new Error(
            'modalDialog: Unable to determine the widget to' +
            ' use for field named `' + path.join('.') + '`;' +
            ' widget or field type was not correctly specified'
        );
    }

    /* Event handlers */
    okbtn.click(function () {
        $.modal.close();
    });
    cancelbtn.click(function () {
        $.modal.close();
    });
    div.submit(function (ev) {
        ev.preventDefault();
        okbtn.click();
        return false;
    });

    /* Markup */
    var okbtn = $(
        '<input type="button" value="' + h(action)  + '" />"'
    );
    var cancelbtn = $(
        '<input type="button" value="Cancel" />'
    );
    div.append(
        widget.toHTML(field, path, value, raw, errors, offset)
    );
    div.append(okbtn);
    div.append(cancelbtn);

    /* Launch */
    div.modal();
    utils.resizeModal(div);
};


