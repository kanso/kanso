exports['duality-contrib-comments:comments_by_target'] = {
    map: function (doc) {
        if (doc.type === 'duality-contrib-comments:comment') {
            emit([doc.target, doc.time], null);
        }
    }
};

exports['duality-contrib-comments:comments_by_user'] = {
    map: function (doc) {
        if (doc.type === 'duality-contrib-comments:comment') {
            emit([doc.user, doc.time], null);
        }
    }
};
