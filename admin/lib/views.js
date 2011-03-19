/*global emit: false, start: false, log: false, getRow: false, send: false,
  $: false*/

exports.apps = {
    map: function (doc) {
        var id = doc._id;
        if (doc.format === 'kanso') {
            if (id !== '_design/admin' && id.substr(0, 8) === '_design/') {
                emit(id.substr(8), id);
            }
        }
    }
};

exports.types = {
    map: function (doc) {
        if (doc.type && doc._id.substr(0, 8) !== '_design/') {
            emit([doc.type, doc._id], doc._id);
        }
    }
};
