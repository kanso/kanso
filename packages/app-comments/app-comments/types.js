var permissions = require('kanso/permissions'),
    fields = require('kanso/fields'),
    Type = require('kanso/types').Type;


exports['app-comments:comment'] = new Type('app-comments:comment', {
    permissions: {
        add: permissions.loggedIn(),
        update: permissions.hasRole('_admin'),
        delete: permissions.any([
            permissions.usernameMatchesField('user'),
            permissions.hasRole('_admin')
        ])
    },
    fields: {
        user: fields.creator(),
        text: fields.string(),
        time: fields.string(),
        target: fields.string()
    }
});
