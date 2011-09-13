/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/test/static/*', to: 'static/nodeunit-testrunner/*'},
    {from: '/test', to: '_show/module_list'},
    {from: '/test/', to: '_show/module_list'},
    {from: '/test/all', to: '_show/run_all'},
    {from: '/test/:name', to: '_show/run_module'}
];

