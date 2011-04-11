var session = require('kanso/session'),
    templates = require('kanso/templates'),
    utils = require('./utils');


exports.options = {
    include_design: true
};

exports.rewrites = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_list/applist/apps'},
    {from: '/:app', to: '_show/types'},
    {from: '/:app/types/:type/add', to: '_show/addtype', method: 'GET'},
    {from: '/:app/types/:type/add', to: '_update/addtype', method: 'POST'},
    {from: '/:app/types/:type', to: '_list/typelist/types', query: {
        startkey: [':type'],
        endkey: [':type', {}],
        include_docs: true,
        limit: 10
    }},
    {from: '/:app/view/:id', to: '_show/viewtype/:id', method: 'GET'},
    {from: '/:app/edit/:id', to: '_show/edittype/:id', method: 'GET'},
    {from: '/:app/edit/:id', to: '_update/updatetype/:id', method: 'POST'},
    {from: '/:app/delete/:id', to: '_update/deletetype/:id', method: 'POST'},
    {from: '/:app/views/:view', to: '_show/viewlist', query: {
        include_docs: true,
        limit: 10
    }}
];

exports.views = require('./views');
exports.lists = require('./lists');
exports.shows = require('./shows');
exports.updates = require('./updates');


exports.bindSessionControls = function () {
    $('#session .logout a').click(function () {
        session.logout();
    });
    $('#session .login a').click(function () {
        var div = $('<div><h2>Login</h2></div>');
        div.append('<form id="login_form" action="/_session" method="POST">' +
            '<div class="general_errors"></div>' +
            '<div class="username field">' +
                '<label for="id_name">Username</label>' +
                '<input id="id_name" name="name" type="text" />' +
                '<div class="errors"></div>' +
            '</div>' +
            '<div class="password field">' +
                '<label for="id_password">Password</label>' +
                '<input id="id_password" name="password" type="password" />' +
                '<div class="errors"></div>' +
            '</div>' +
            '<div class="actions">' +
                '<input type="submit" id="id_login" value="Login" />' +
                '<input type="button" id="id_cancel" value="Cancel" />' +
            '</div>' +
        '</form>');
        $('#id_cancel', div).click(function () {
            $.modal.close();
        });
        $('form', div).submit(function (ev) {
            ev.preventDefault();
            var username = $('input[name="name"]', div).val();
            var password = $('input[name="password"]', div).val();
            console.log($('.username .errors', div));
            $('.username .errors', div).text(
                username ? '': 'Please enter a username'
            );
            $('.password .errors', div).text(
                password ? '': 'Please enter a password'
            );
            utils.resizeModal(div);
            if (username && password) {
                session.login(username, password, function (err) {
                    $('.general_errors', div).text(err ? err.toString(): '');
                    utils.resizeModal(div);
                    if (!err) {
                        $(div).fadeOut('slow', function () {
                            $.modal.close();
                        });
                    }
                });
            }
            return false;
        });
        div.modal({autoResize: true, overlayClose: true});
    });
    $('#session .signup a').click(function () {
        var div = $('<div><h2>Create account</h2></div>');
        div.append('<form id="signup_form" action="/_session" method="POST">' +
            '<div class="general_errors"></div>' +
            '<div class="username field">' +
                '<label for="id_name">Username</label>' +
                '<input id="id_name" name="name" type="text" />' +
                '<div class="errors"></div>' +
            '</div>' +
            '<div class="password field">' +
                '<label for="id_password">Password</label>' +
                '<input id="id_password" name="password" type="password" />' +
                '<div class="errors"></div>' +
            '</div>' +
            '<div class="actions">' +
                '<input type="submit" id="id_create" value="Create" />' +
                '<input type="button" id="id_cancel" value="Cancel" />' +
            '</div>' +
        '</form>');
        $('#id_cancel', div).click(function () {
            $.modal.close();
        });
        $('form', div).submit(function (ev) {
            ev.preventDefault();
            var username = $('input[name="name"]', div).val();
            var password = $('input[name="password"]', div).val();
            console.log($('.username .errors', div));
            $('.username .errors', div).text(
                username ? '': 'Please enter a username'
            );
            $('.password .errors', div).text(
                password ? '': 'Please enter a password'
            );
            utils.resizeModal(div);
            if (username && password) {
                session.signup(username, password, function (err) {
                    $('.general_errors', div).text(err ? err.toString(): '');
                    utils.resizeModal(div);
                    if (!err) {
                        session.login(username, password, function (err) {
                            $('.general_errors', div).text(err ? err.toString(): '');
                            utils.resizeModal(div);
                            $(div).fadeOut('slow', function () {
                                $.modal.close();
                            });
                        });
                    }
                });
            }
            return false;
        });
        div.modal({autoResize: true, overlayClose: true});
    });
};

exports.init = function () {
    exports.bindSessionControls();
};

exports.sessionChange = function (userCtx, req) {
    $('#session').replaceWith(templates.render('session.html', req, userCtx));
    exports.bindSessionControls();
};
