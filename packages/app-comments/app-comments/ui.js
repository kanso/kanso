var comments = require('./comments'),
    utils = require('kanso/utils');


exports.bind = function (selector) {
    $(selector).submit(function (ev) {
        ev.preventDefault();
        var form = this;

        var text = $('[name="text"]', form).val();
        var target = $('[name="target"]', form).val();
        var user = utils.userCtx && utils.userCtx.name;

        if (!target) {
            $('.general_errors', form).text('Comment form missing target');
        }
        else if (!user) {
            $('.general_errors', form).text(
                'You must be logged-in to post a comment'
            );
        }
        else {
            $('.general_errors', form).text('');
        }
        if (!text) {
            $('.field', form).addClass('validation_error');
            $('.field .errors').text('Missing comment text');
        }
        else {
            $('.field', form).addClass('validation_error');
            $('.field .errors').text('');
        }

        comments.add(target, user, text, function (err) {
            if (err) {
                $('.general_errors', form).text(err);
            }
            else {
                // clear successfully posted comment
                $('[name="text"]', form).text('');
            }
        });
    });
};
