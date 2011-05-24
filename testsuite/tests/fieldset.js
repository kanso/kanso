var fields = require('kanso/fields'),
    fieldset = require('kanso/fieldset');


exports['createDefaults'] = function (test) {
    var userCtx = {name: 'testuser'};
    var f = {
        one: fields.string({default_value: 'asdf'}),
        two: {
            three: fields.number({default_value: 1}),
            four: fields.string()
        },
        five: fields.boolean(),
        user: fields.string({
            default_value: function (userCtx) {
                return userCtx.name;
            }
        })
    };
    test.same(
        fieldset.createDefaults(f, userCtx),
        {one: 'asdf', two: {three: 1}, user: 'testuser'}
    );
    test.done();
};
