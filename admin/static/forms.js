(function ($) {
    var utils = require('lib/utils');
    var querystring = require('kanso/querystring');
    var kanso_utils = require('kanso/utils');

    function getTypeForm(req, ddoc, typename, doc) {
        var settings = utils.appRequire(ddoc, 'kanso/settings');
        var app = utils.appRequire(ddoc, settings.load);
        var forms = utils.appRequire(ddoc, 'kanso/forms');
        var type = app.types[typename];
        return new forms.Form(type, doc);
    }

    function modalAddHandler(mainform, td, req, ddoc, typename) {
        return function (ev) {
            ev.preventDefault();
            var forms = utils.appRequire(ddoc, 'kanso/forms');
            var div = $(this).parent();
            var qs = $('form', div).serialize();
            var rawval = querystring.parse(qs);
            var form = getTypeForm(req, ddoc, typename);
            form.validate({form: rawval});
            if (form.isValid()) {
                var newval = forms.parseRaw(form.fields, rawval);
                var jsonval = JSON.stringify(newval);
                $('input:hidden', td).attr({value: jsonval});
                $('span.value', td).text(newval._id);

                $.modal.close();
                $(mainform).bindKansoForm(req);
            }
            else {
                showAddModal(mainform, td, req, ddoc, typename, div, rawval);
            }
            return false;
        };
    }

    function showAddModal(mainform, td, req, ddoc, typename, div, rawval) {
        var forms = utils.appRequire(ddoc, 'kanso/forms');
        div.html('');
        div.append('<h2>Add ' + typename + '</h2>');

        var form = getTypeForm(req, ddoc, typename);
        if (rawval) {
            form.validate({form: rawval});
        }
        var divform = $('<form><table class="form_table"><tbody>' +
            form.toHTML(req, forms.render.table) +
        '</tbody></table></form>').submit(
            modalAddHandler(mainform, td, req, ddoc, typename)
        );
        div.append(divform);
        var cancelbtn = $('<input type="button" value="Cancel" />');
        cancelbtn.click(function () {
            $.modal.close();
        });
        var addbtn = $('<input type="button" value="Add" />');
        addbtn.click(modalAddHandler(mainform, td, req, ddoc, typename));
        div.append(addbtn).append(cancelbtn);

        $('input[name="_id"]', div).attr({value: kanso_utils.generateUUID()});

        div.modal();
    }

    function modalEditHandler(mainform, td, req, ddoc, typename, doc) {
        return function (ev) {
            ev.preventDefault();
            var forms = utils.appRequire(ddoc, 'kanso/forms');
            var div = $(this).parent();
            var qs = $('form', div).serialize();
            var rawval = querystring.parse(qs);
            var form = getTypeForm(req, ddoc, typename);
            form.validate({form: rawval});
            if (form.isValid()) {
                var newval = forms.parseRaw(form.fields, rawval);
                var jsonval = JSON.stringify(newval);
                $('input:hidden', td).attr({value: jsonval});
                $('span.value', td).text(newval._id);

                $.modal.close();
                $(mainform).bindKansoForm(req);
            }
            else {
                showEditModal(mainform, td, req, ddoc, typename, div, doc, rawval);
            }
            return false;
        };
    }

    function showEditModal(mainform, td, req, ddoc, typename, div, doc, rawval) {
        var forms = utils.appRequire(ddoc, 'kanso/forms');
        div.html('');
        div.append('<h2>Edit ' + typename + '</h2>');

        var form = getTypeForm(req, ddoc, typename, doc);
        if (rawval) {
            form.validate({form: rawval});
        }
        var divform = $('<form><table class="form_table"><tbody>' +
            form.toHTML(req, forms.render.table) +
        '</tbody></table></form>').submit(
            modalEditHandler(mainform, td, req, ddoc, typename, doc)
        );
        div.append(divform);
        var cancelbtn = $('<input type="button" value="Cancel" />');
        cancelbtn.click(function () {
            $.modal.close();
        });
        var updatebtn = $('<input type="button" value="Update" />');
        updatebtn.click(modalEditHandler(mainform, td, req, ddoc, typename, doc));
        div.append(updatebtn).append(cancelbtn);

        div.modal();
    }

    $.fn.bindKansoForm = function (req) {
        var mainform = this;

        utils.getDesignDoc(req.query.app, function (err, ddoc) {
            if (err) {
                throw err;
            }
            var settings = utils.appRequire(ddoc, 'kanso/settings');
            var app = utils.appRequire(ddoc, settings.load);
            var forms = utils.appRequire(ddoc, 'kanso/forms');

            $('td.embedded', mainform).each(function () {
                var td = this;
                var typename = $(this).attr('rel');
                var type = app.types[typename];
                var val = $('input:hidden', this).val();
                var doc = val ? JSON.parse(val): undefined;

                // remove any previously added buttons
                $('input:button', this).remove();

                if (val) {
                    var editbtn = $('<input type="button" value="Edit" />');
                    var delbtn  = $('<input type="button" value="Delete" />');
                    editbtn.click(function () {
                        var div = $('<div/>');
                        showEditModal(mainform, td, req, ddoc, typename, div, doc);
                    });
                    delbtn.click(function () {
                        $('input:hidden', td).val('');
                        $('span.value', td).html('');
                        $(mainform).bindKansoForm(req);
                    });
                    $(this).append(editbtn).append(delbtn);
                }
                else {
                    var addbtn  = $('<input type="button" value="Add" />');
                    addbtn.click(function () {
                        var div = $('<div/>');
                        showAddModal(mainform, td, req, ddoc, typename, div);
                    });
                    $(this).append(addbtn);
                }
            });
        });
    };
 }(jQuery));
