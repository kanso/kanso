/*global $: false */

var utils = require('./utils'),
    db = require('kanso/db'),
    kanso_utils = require('kanso/utils'),
    querystring = require('kanso/querystring');


exports.bind = function (req) {
    $('form').each(function () {
        $('.embedded, .embeddedlist', this).each(function () {
            exports.createAddBtn(req, this);
            $('tr', this).each(function () {
                exports.updateRow(req, this);
            });
        });
    });
};

exports.updateRow = function (req, row) {
    var val = exports.getRowValue(row);
    var field_td = $(row).parent().parent().parent();
    if (val) {
        exports.addRowControls(req, row);
    }
    else {
        $(row).remove();
    }
    var row_count = $('tr', field_td).length;
    if (field_td.parent().hasClass('embedded')) {
        if (!row_count) {
            $('.addbtn', field_td).show();
        }
        else {
            $('.addbtn', field_td).hide();
        }
    }
    exports.renumberRows(field_td);
};

exports.getRowValue = function (row) {
    var str = $('input:hidden', row).val();
    if (!str) {
        return;
    }
    return JSON.parse(str);
};

exports.addRowControls = function (req, row) {
    if (exports.getRowValue(row)) {
        var container = $('td.actions', row).html('');
        var editbtn = $('<input type="button" class="editbtn" value="Edit" />');
        var delbtn  = $('<input type="button" class="delbtn" value="Delete" />');
        editbtn.click(exports.editbtnHandler(req));
        delbtn.click(exports.delbtnHandler(req));
        container.append(editbtn, delbtn);
    }
};

exports.createAddBtn = function (req, field_row) {
    var addbtn = $('<input type="button" class="addbtn" value="Add" />');
    addbtn.click(exports.addbtnHandler(req));
    // remove any existing add buttons
    $('.field .addbtn', field_row).remove();
    $('.field', field_row).append(addbtn);
};

exports.getModules = function (req, callback) {
    utils.getDesignDoc(req.query.app, function (err, ddoc) {
        if (err) {
            throw err;
        }
        var settings = utils.appRequire(ddoc, 'kanso/settings');
        var app = utils.appRequire(ddoc, settings.load);
        var forms = utils.appRequire(ddoc, 'kanso/forms');
        callback(settings, app, forms);
    });
};

exports.showModal = function (div, field_td, row, req, typename, val, rawval) {
    exports.getModules(req, function (settings, app, forms) {
        var type = app.types[typename];
        var form = new forms.Form(type, val);

        if (rawval) {
            form.validate(rawval);
        }

        div.html('<h2>' + (val ? 'Edit ': 'Add ') + typename + '</h2>');
        var divform = $('<form><table class="form_table"><tbody>' +
            form.toHTML(req) +
        '</tbody></table></form>');
        div.append(divform);

        var action = (val ? 'Update': 'Add');
        var okbtn = $('<input type="button" value="' + action  + '" />"');
        okbtn.click(function () {
            var qs = $('form', div).serialize().replace(/\+/g, '%20');
            var rawval = querystring.parse(qs);
            form.validate(rawval);
            if (form.isValid()) {
                if (!val) {
                    row = exports.addRow(field_td);
                }
                console.log('row');
                console.log(row);
                var jsonval = JSON.stringify(form.values);
                $('input:hidden', row).val(jsonval);
                $('span.value', row).text(form.values._id);
                exports.updateRow(req, row);
                $.modal.close();
            }
            else {
                exports.showModal(div, field_td, row, req, typename, val, rawval);
            }
        });
        div.append(okbtn);
        divform.submit(function (ev) {
            ev.preventDefault();
            okbtn.click();
            return false;
        });

        var cancelbtn = $('<input type="button" value="Cancel" />');
        cancelbtn.click(function () {
            $.modal.close();
        });
        div.append(cancelbtn);

        // generate ids when adding documents
        if (!val) {
            db.newUUID(100, function (err, uuid) {
                if (err) {
                    throw err;
                }
                $('input[name="_id"]', div).attr({
                    value: uuid
                });
            });
        }

        div.modal();
        utils.resizeModal(div);
    });
};

exports.renumberRows = function (field_td) {
    var field_row = field_td.parent();
    var name = $('table', field_td).attr('rel');
    if (field_row.hasClass('embeddedlist')) {
        $('tr', field_td).each(function (i) {
            $('input:hidden', this).attr({'name': name + '.' + i});
        });
    }
    else {
        $('input:hidden', field_td).attr({'name': name});
    }
};

exports.addRow = function (field_td) {
    console.log('addRow');
    var tr = $(
        '<tr>' +
            '<td>' +
                '<input type="hidden" value="" name="" />' +
                '<span class="value"></span>' +
            '</td>' +
            '<td class="actions"></td>' +
        '</tr>'
    );
    $('tbody', field_td).append(tr);
    return tr;
};

exports.addbtnHandler = function (req) {
    return function (ev) {
        var field_td = $(this).parent();
        var typename = field_td.attr('rel');
        var div = $('<div/>');
        exports.showModal(div, field_td, null, req, typename);
    };
};

exports.getRowType = function (row) {
    var field_td = row.parent().parent().parent();
    return field_td.attr('rel');
};

exports.editbtnHandler = function (req) {
    return function (ev) {
        var row = $(this).parent().parent();
        var field_td = row.parent().parent().parent();
        var val = exports.getRowValue(row);
        var typename = exports.getRowType(row);
        var div = $('<div/>');
        exports.showModal(div, field_td, row, req, typename, val);
    };
};

exports.delbtnHandler = function (req) {
    return function (ev) {
        var row = $(this).parent().parent();
        $('input:hidden', row).val('');
        $('span.value', row).html('');
        exports.updateRow(req, row);
    };
};
