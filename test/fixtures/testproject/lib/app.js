exports.testproperty = "test property";

exports.shows = {
    testshow: function (doc, req) {
        return "test";
    }
};

exports.lists = {
    testlist: function (head, req) {
        return "test";
    }
};

exports.updates = {
    testupdate: function (doc, req) {
        return [doc, "test"];
    }
};

exports.filters = {
    testfilter: function (doc, req) {
        return true;
    }
};

exports.validate_doc_update = function (doc, req) {
    return;
};
