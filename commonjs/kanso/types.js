var Field = require('./fields').Field;


exports.validate = function (types, doc) {
    if (!doc.type) {
        return; // unknown document type
    }
    var type;
    for (var k in types) {
        if (types.hasOwnProperty(k) && k === doc.type) {
            type = types[k];
            break;
        }
    }
    return exports.validateFields(type.fields, doc, doc);
};


exports.validateFields = function (fields, values, doc) {
    var errors = [];

    for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
            var f = fields[k];
            if (f instanceof Field) {
                // its a field, validate it
                try {
                    f.validate(doc, values[k], values[k]);
                }
                catch (e) {
                    errors.push(e);
                }
            }
            else {
                // recurse through sub-objects in the type's schema to find
                // more fields
                errors = errors.concat(
                    exports.validateFields(fields[k], values[k], doc)
                );
            }
        }
    }

    return errors;
};
