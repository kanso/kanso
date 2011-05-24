/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_show/test_module_list'},
    {from: '/all', to: '_show/run_all_modules'},
    {from: '/:name', to: '_show/run_test_module'},
    {from: '*', to: '_show/not_found'}
];
