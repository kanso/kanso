Be sure to add a call to validate the app-comments:comment type in your app's
validate\_doc\_update function!

    ...
    var types = require('kanso/types'),
        comment_types = require('app-comments/types');


    function (newDoc, oldDoc, userCtx) {
        ...
        types.validate_doc_update(comment_types, newDoc, oldDoc, userCtx);
    }
