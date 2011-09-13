var templates = require('kanso/templates'),
    nodeunit = require('nodeunit'),
    events = require('kanso/events'),
    utils = require('./utils');


exports.module_list = function (doc, req) {
    var modules = [];
    if (req.client) {
        modules = utils.getTestModuleNames();
        console.log('module_list');
        console.log(modules);
    }
    return {
        title: 'Tests',
        content: templates.render('nodeunit-testrunner/module_list.html', req, {
            modules: modules
        })
    };
};

function run (modules, name, req) {
    events.once('afterResponse', function (info, req, res) {
        nodeunit.run(modules);
    });
    return {
        title: 'Tests: ' + name,
        content: templates.render('nodeunit-testrunner/run_module.html', req, {
            name: name
        })
    };
};

exports.run_module = function (doc, req) {
    var name = req.query.name;
    return run({'tests': require('tests/' + name)}, name, req);
};

exports.run_all = function (doc, req) {
    return run(req.client ? utils.getTestModules(): {}, 'all', req);
};
