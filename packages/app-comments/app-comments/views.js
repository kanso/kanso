exports['app-comments:comments_by_target'] = {
    map: function (doc) {
        if (doc.type === 'app-session:comment') {
            emit(doc.target, null);
        }
    }
};
