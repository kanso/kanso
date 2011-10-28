var permissions = require('couchtypes/permissions'),
    fields = require('couchtypes/fields'),
    Type = require('couchtypes/types').Type;


exports['duality-contrib-comments:comment'] = new Type(
    'duality-contrib-comments:comment',
    {
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
    }
);
