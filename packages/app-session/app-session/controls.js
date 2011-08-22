var session = require('kanso/session');


exports.bind = function () {
    $('#session .logout a').click(function (ev) {
        ev.preventDefault();
        session.logout();
        return false;
    });
    $('#session .login a').click(function (ev) {
        ev.preventDefault();
        $('#session .login').addClass('active');
        $('#login_dropdown').show();
        $('#login_dropdown input[name="name"]').focus();
        return false;
    });
    $('#login_form_cancel').click(function (ev) {
        $('#session .login').removeClass('active');
        $('#login_dropdown').hide();
    });
    $('#login_form').submit(function (ev) {
        ev.preventDefault();
        var form = this;
        $('.general_errors', form).text('');
        var spinner_elt = $('.spinner', form).show();
        var username = $('input[name="name"]', form).val();
        var password = $('input[name="password"]', form).val();
        if (!username) {
            $('.username .errors', form).text('Please enter a username');
            $('.username').addClass('validation_error');
        }
        else {
            $('.username .errors', form).text('');
            $('.username').removeClass('validation_error');
        }
        if (!password) {
            $('.password .errors', form).text('Please enter a password');
            $('.password').addClass('validation_error');
        }
        else {
            $('.password .errors', form).text('');
            $('.password').removeClass('validation_error');
        }
        if (username && password) {
            session.login(username, password, function (err) {
                if (err) {
                    $('.general_errors', form).text(err.toString());
                    spinner_elt.hide();
                }
            });
        } else {
            spinner_elt.hide();
        }
        return false;
    });
};
