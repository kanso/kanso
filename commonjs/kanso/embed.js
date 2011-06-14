/* global $: false */

var core = require('kanso/core'),
    db = require('kanso/db'),
    loader = require('kanso/loader'),
    utils = require('kanso/utils'),
    widgets = require('kanso/widgets'),
    querystring = require('kanso/querystring'),
    sanitize = require('kanso/sanitize'),
    _ = require('kanso/underscore')._;

var h = sanitize.escapeHtml;



/**
 * getModules
 */
exports.getModules = function (/*optional*/req, callback) {
    if (!callback) {
        /* Arity = 1: callback only */
        callback = req;
        req = utils.currentRequest();
    }
    db.getDesignDoc(req.query.app, function (err, ddoc) {
        if (err) {
            throw err;
        }
        var settings = loader.appRequire(ddoc, 'kanso/settings');
        var app = loader.appRequire(ddoc, settings.load);
        var forms = loader.appRequire(ddoc, 'kanso/forms');
        callback(settings, app, forms);
    });
};

/**
 * A showModal wrapper, containing functionality specific to the
 * administrative interface. This function retrieves information
 * from a second application instance, and then calls the usual
 * showModal implementation.
 */
exports.adminShowModal = function (div, field_td, row,
                                   typename, val, rawval, field) {

    exports.getModules(function (settings, app, forms) {
        var type = app.types[typename];
        var form = new forms.Form(type, val);

        return exports.showModal(
            type, form, div, field_td, row,
            typename, val, rawval, field
        );
    });
};

/**
 * Show a modal dialog containing an editable form. Once the
 * editing is completed, call addRow and pass along the JSON-encoded
 * form data.
 */
exports.showModal = function (type, div, field_td, row,
                              typename, val, rawval, field) {

    var form = new forms.Form(type, val);

    if (rawval) {
        form.validate(rawval);
    }

    div.html('<h2>' + (val ? 'Edit ': 'Add ') + h(typename) + '</h2>');
    div.append('<form>' + form.toHTML() + '</form>');

    var action = (val ? 'Update': 'Add');
    var okbtn = $(
        '<input type="button" value="' + h(action)  + '" />"'
    );

    okbtn.click(function () {
        var qs = $('form', div).serialize().replace(/\+/g, '%20');
        var rawval = querystring.parse(qs);
        form.validate(rawval);

        if (form.isValid()) {
            if (!val) {
                row = exports.addRow(
                    field_td, field, val, rawval, type
                );
            }
            /* Stash JSON-encoded form data in hidden input */
            var jsonval = JSON.stringify(form.values);
            $('input:hidden', row).val(jsonval);
            $('span.value', row).text(form.values._id);
            exports.updateRow(row);
            $.modal.close();
        }
        else {
            /* Repost form showing errors */
            exports.showModal(
                type, form, div, field_td, row,
                    typename, val, rawval, field
            );
        }
    });
    div.append(okbtn);
    div.submit(function (ev) {
        ev.preventDefault();
        okbtn.click();
        return false;
    });

    var cancelbtn = $(
        '<input type="button" value="Cancel" />'
    );
    cancelbtn.click(function () {
        $.modal.close();
    });
    div.append(cancelbtn);

    div.modal();
    utils.resizeModal(div);

    if (!val) {
        exports.generateNewDocumentIdentifier(div);
    }
};


