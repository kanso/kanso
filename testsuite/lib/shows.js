/*globals $: false, nodeunit: false */

/**
 * Show functions to be exported from the design doc.
 */

var templates = require('kanso/templates'),
    forms = require('kanso/forms'),
    fields = require('kanso/fields'),
    types = require('kanso/types'),
    utils = require('./utils');


exports.test_module_list = function (doc, req) {
    if (req.client) {
        // utils.getTestModuleNames relies on the client-side moduleCache
        var content = templates.render('test_module_list.html', req, {
            test_modules: utils.getTestModuleNames()
        });
        $('#content').html(content);
        document.title = 'Kanso Tests';
    }
    else {
        return templates.render('base.html', req, {
            title: 'Kanso Tests',
            content: '<h1>Kanso Tests</h1>'
        });
    }
};

exports.run_test_module = function (doc, req) {
    var name = req.query.name;
    var title = 'Kanso Tests: ' + name;
    var content = templates.render('run_test_module.html', req, {name: name});

    if (req.client) {
        $('#content').html(content);
        document.title = title;
        nodeunit.run({'tests': require('tests/' + name)});
    }
    else {
        return templates.render('base.html', req, {
            title: title,
            content: content
        });
    }
};

exports.run_all_modules = function (doc, req) {
    var name = 'all';
    var title = 'Kanso Tests: ' + name;
    var content = templates.render('run_test_module.html', req, {name: name});

    if (req.client) {
        $('#content').html(content);
        document.title = title;
        nodeunit.run(utils.getTestModules());
    }
    else {
        return templates.render('base.html', req, {
            title: title,
            content: content
        });
    }
};

exports.not_found = function (doc, req) {
    var content = templates.render('404.html', req, {});

    if (req.client) {
        $('#content').html(content);
        document.title = '404 - Not Found';
    }
    else {
        return {code: 404, body: templates.render('base.html', req, {
            title: '404 - Not Found',
            content: content
        })};
    }
};

exports.test = function (doc, req) {
    var f = new forms.Form(
        new types.Type('test', { })
    );

    if (req.client) {
        throw new Error('Cannot run this test on client');
    } else {
        return f.toHTML();
    }
};

