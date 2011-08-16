var session = require('kanso/session');


exports.bind = function () {
    $('#session .logout a').click(function (ev) {
        ev.preventDefault();
        session.logout();
        return false;
    });
    $('#session .login a').click(function (ev) {
        ev.preventDefault();
        $('#login_dropdown').show();
        return false;
    });
    $('#login_form_cancel').click(function (ev) {
        $('#login_dropdown').hide();
    });
    $('#login_form').submit(function (ev) {
        ev.preventDefault();
        var form = this;
        $('.general_errors', form).text('');
        var spinner_elt = $('.spinner', form).show();
        var username = $('input[name="name"]', form).val();
        var password = $('input[name="password"]', form).val();
        $('.username .errors', form).text(
            username ? '': 'Please enter a username'
        );
        $('.password .errors', form).text(
            password ? '': 'Please enter a password'
        );
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
