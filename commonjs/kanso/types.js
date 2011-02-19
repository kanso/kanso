var Field = require('./fields').Field;


exports.validate = function (types, doc) {
    if (!doc.type) {
        return; // unknown document type
    }
    for (var k in types) {
        if (types.hasOwnProperty(k) && k === doc.type) {
            return exports.validateFields(
                types[k].fields, doc, doc, [], types[k].allow_extra_fields
            );
        }
    }
    return; // unknown document type
};


exports.validateFields = function (fields, values, doc, path, allow_extra) {
    var errors = [],
        path = path || [];

    for (var k in values) {
        if (values.hasOwnProperty(k)) {
            var f = fields[k];
            if (path.length === 0 && k === 'type') {
                // ignore the type property
            }
            else if (f === undefined) {
                // extra field detected
                if (!allow_extra) {
                    errors.push(new Error(
                        'Field "' + path.concat(k).join('.') + '" not defined'
                    ));
                }
            }
            else if (f instanceof Field) {
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
                errors = errors.concat(exports.validateFields(
                    fields[k], values[k], doc, path.concat(k), allow_extra
                ));
            }
        }
    }
    return errors;
};
