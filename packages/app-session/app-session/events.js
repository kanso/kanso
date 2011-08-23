/**
 * Bindings to Kanso events
 */

var events = require('kanso/events'),
    templates = require('kanso/templates'),
    controls = require('./controls');


events.on('init', function () {
    controls.bind();
});

events.on('sessionChange', function (userCtx, req) {
    $('#session').replaceWith(
        templates.render('app-session/session.html', req, userCtx)
    );
    controls.bind();
});
