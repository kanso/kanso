exports['app-comments:comments_by_target'] = {
    map: function (doc) {
        if (doc.type === 'app-comments:comment') {
            emit([doc.target, doc.time], null);
        }
    }
};

exports['app-comments:comments_by_user'] = {
    map: function (doc) {
        if (doc.type === 'app-comments:comment') {
            emit([doc.user, doc.time], null);
        }
    }
};
