var Field = exports.Field = function (options) {
    options = options || {};

    this.required = ('required' in options) ? options.required: true;
    this.validators = ('validators' in options) ? options.validators: [];
    this.parse = options.parse || function (raw) {
        return raw;
    };
};

Field.prototype.validate = function (doc, value, raw) {
    if (raw === '' || raw === null || raw === undefined) {
        // don't validate empty fields, but check if required
        if (this.required) {
            throw new Error('required field');
        }
    }
    else {
        for (var i = 0; i < this.validators.length; i += 1) {
            this.validators[i](doc, value, raw);
        }
    }
};
