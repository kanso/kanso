/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    /*
    {from: '/test/static/*', to: 'static/nodeunit-testrunner/*'},
    {from: '/test',          to: '_show/nodeunit-testrunner:module_list'},
    {from: '/test/',         to: '_show/nodeunit-testrunner:module_list'},
    {from: '/test/all',      to: '_show/nodeunit-testrunner:run_all'},
    {from: '/test/:name',    to: '_show/nodeunit-testrunner:run_module'}
    */
    {from: '/test/static/*', to: 'static/nodeunit-testrunner/*'},
    {from: '/test', to: 'static/nodeunit-testrunner/index.html'}
];

