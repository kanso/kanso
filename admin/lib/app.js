/*global $: false */

var session = require('session'),
    templates = require('kanso/templates'),
    events = require('kanso/events'),
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
        include_docs: 'true',
        limit: '10'
    }},
    {from: '/:app/view/:id', to: '_show/viewtype/:id', method: 'GET'},
    {from: '/:app/edit/:id', to: '_show/edittype/:id', method: 'GET'},
    {from: '/:app/edit/:id', to: '_update/updatetype/:id', method: 'POST'},
    {from: '/:app/delete/:id', to: '_update/deletetype/:id', method: 'POST'},
    {from: '/:app/views/:view', to: '_show/viewlist', query: {
        limit: '10'
    }}
];

exports.views = require('./views');
exports.lists = require('./lists');
exports.shows = require('./shows');
exports.updates = require('./updates');


exports.bindSessionControls = function () {
    var login_popup, signup_popup;
    $('#session .logout a').click(function (ev) {
        ev.preventDefault();
        session.logout();
        return false;
    });
    $('#session .login a').click(function (ev) {
        ev.preventDefault();
        var div = $('<div><h2>Login</h2></div>');
        div.append(
            '<form id="login_form" action="/_session" method="POST">' +
            '<div class="render">' +
                '<div class="general_errors"></div>' +
                '<div class="username field">' +
                    '<label for="id_name">Username</label>' +
                    '<input id="id_name" name="name" type="text" />' +
                    '<div class="errors"></div>' +
                '</div>' +
                '<div class="password field">' +
                    '<label for="id_password">Password</label>' +
                    '<input id="id_password" name="password"' +
                        ' type="password" />' +
                    '<div class="errors"></div>' +
                '</div>' +
            '</div>' +
            '<div class="clear spinner" style="display: none;" />' +
            '<div class="actions">' +
                '<input type="submit" id="id_login" value="Login" />' +
                '<input type="button" id="id_cancel" value="Cancel" />' +
            '</div>' +
            '<div class="clear" />' +
            '</form>'
        );
        $('#id_cancel', div).click(function () {
            login_popup.uPopup('destroy');
        });
        $('form', div).submit(function (ev) {
            ev.preventDefault();
            var spinner_elt = $('#login_form > .spinner', div).show();
            var username = $('input[name="name"]', div).val();
            var password = $('input[name="password"]', div).val();
            $('.username .errors', div).text(
                username ? '': 'Please enter a username'
            );
            $('.password .errors', div).text(
                password ? '': 'Please enter a password'
            );
            if (username && password) {
                session.login(username, password, function (err) {
                    if (!err) {
                        login_popup.uPopup('destroy');
                    } else {
                        $('.general_errors', div).text(err.toString());
                        spinner_elt.hide();
                    }
                });
            } else {
                spinner_elt.hide();
            }
            return false;
        });

        login_popup = div.uPopup('create', this, {
            center: true,
            vertical: true
        });

        return false;
    });
    $('#session .signup a').click(function (ev) {
        ev.preventDefault();
        var div = $('<div><h2>Create account</h2></div>');
        div.append(
            '<form id="signup_form" action="/_session" method="POST">' +
            '<div class="render">' +
                '<div class="general_errors"></div>' +
                '<div class="username field">' +
                    '<label for="id_name">Username</label>' +
                    '<input id="id_name" name="name" type="text" />' +
                    '<div class="errors"></div>' +
                '</div>' +
                '<div class="password field">' +
                    '<label for="id_password">Password</label>' +
                    '<input id="id_password" name="password"' +
                        ' type="password" />' +
                    '<div class="errors"></div>' +
                '</div>' +
            '</div>' +
            '<div class="clear spinner" style="display: none;" />' +
            '<div class="actions">' +
                '<input type="submit" id="id_create" value="Create" />' +
                '<input type="button" id="id_cancel" value="Cancel" />' +
            '</div>' +
            '<div class="clear" />' +
            '</form>'
        );
        $('#id_cancel', div).click(function () {
            signup_popup.uPopup('destroy');
        });
        $('form', div).submit(function (ev) {
            ev.preventDefault();
            var spinner_elt = $('#signup_form > .spinner', div).show();
            var username = $('input[name="name"]', div).val();
            var password = $('input[name="password"]', div).val();
            $('.username .errors', div).text(
                username ? '': 'Please enter a username'
            );
            $('.password .errors', div).text(
                password ? '': 'Please enter a password'
            );
            if (username && password) {
                session.signup(username, password, function (err) {
                    if (!err) {
                        session.login(username, password, function (err) {
                            if (!err) {
                                signup_popup.uPopup('destroy');
                            } else {
                                $('.general_errors', div).text(err.toString());
                                spinner_elt.hide();
                            }
                        });
                    } else {
                        $('.general_errors', div).text(err.toString());
                        spinner_elt.hide();
                    }
                });
            } else {
                spinner_elt.hide();
            }
            return false;
        });
        signup_popup = div.uPopup('create', this, {
            center: true,
            vertical: true
        });
        return false;
    });
};

events.on('init', function () {
    exports.bindSessionControls();
});

events.on('sessionChange', function (userCtx, req) {
    $('#session').replaceWith(templates.render('session.html', req, userCtx));
    exports.bindSessionControls();
});
