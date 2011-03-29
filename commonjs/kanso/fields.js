var validators = require('./validators'),
    widgets = require('./widgets'),
    utils = require('./utils'),
    forms = require('./forms'),
    permissions = require('./permissions');


var Field = exports.Field = function Field(options) {
    options = options || {};

    this.omit_empty = options.omit_empty;
    this.default_value = options.default_value;
    this.label = options.label;
    this.widget = options.widget || widgets.text();
    this.required = ('required' in options) ? options.required: true;
    this.validators = ('validators' in options) ? options.validators: [];
    this.permissions = ('permissions' in options) ? options.permissions: [];
    this.parse = options.parse || function (raw) {
        return raw;
    };
};

Field.prototype.errorHTML = function (errors) {
    if (errors && errors.length) {
        var html = '<ul class="errors">';
        for (var i = 0; i < errors.length; i++) {
            html += '<li class="error_msg">' +
                (errors[i].message || errors[i].toString()) +
            '</li>';
        }
        html += '</ul>';
        return html;
    }
    return '';
};

Field.prototype.labelText = function (name) {
    if (this.label) {
        return this.label;
    }
    return name.substr(0, 1).toUpperCase() + name.substr(1).replace(/_/g, ' ');
};

Field.prototype.labelHTML = function (name, id) {
    return '<label for="' + (id || 'id_' + name) + '">' +
        this.labelText(name, id) +
    '</label>';
};

Field.prototype.classes = function (errors) {
    var r = ['field'];
    if (errors && errors.length) {
        r.push('error');
    }
    if (this.required) {
        r.push('required');
    }
    return r;
};

Field.prototype.validate = function (doc, value, raw) {
    if (value === '' || value === null || value === undefined) {
        // don't validate empty fields, but check if required
        if (this.required) {
            throw new Error('required field');
        }
    }
    else {
        for (var i = 0; i < this.validators.length; i++) {
            this.validators[i](doc, value, raw);
        }
    }
};

Field.prototype.authorize = function (newDoc, oldDoc, newVal, oldVal, userCtx) {
    var perms = this.permissions;
    if (utils.isFunction(perms)) {
        perms(newDoc, oldDoc, newVal, oldVal, userCtx);
    }
    else if (perms) {
        if (oldDoc) {
            if (perms.edit) {
                perms.edit(newDoc, oldDoc, newVal, oldVal, userCtx);
            }
        }
        else {
            if (perms.create) {
                perms.create(newDoc, oldDoc, newVal, oldVal, userCtx);
            }
        }
    }
};

exports.string = function (options) {
    options = options || {};

    options.parse = function (raw) {
        return '' + raw;
    };
    return new Field(options);
};

exports.parseNumber = function (raw) {
    if (raw === null || raw === '') {
        return '';
    }
    return Number(raw);
};

exports.number = function (options) {
    options = options || {};

    options.parse = exports.parseNumber;
    if (!options.validators) {
        options.validators = [];
    }
    options.validators.unshift(function (doc, value) {
        if (isNaN(value)) {
            throw new Error('Not a number');
        }
    });
    return new Field(options);
};


exports.boolean = function (options) {
    options = options || {};
    options.widget = options.widget || widgets.checkbox();
    options.required = options.required || false;

    options.parse = function (raw) {
        return Boolean(raw);
    };
    return new Field(options);
};


exports.url = function (options) {
    options = options || {};

    if (!options.validators) {
        options.validators = [];
    }
    options.validators.unshift(validators.url());
    return exports.string(options);
};


exports.email = function (options) {
    options = options || {};

    if (!options.validators) {
        options.validators = [];
    }
    options.validators.unshift(validators.email());
    return exports.string(options);
};


exports.creator = function (options) {
    options = options || {};
    if (!options.permissions) {
        options.permissions = {};
    }
    var p = options.permissions;
    if (p.create) {
        p.create = permissions.all([
            permissions.matchUsername(),
            p.create
        ]);
    }
    else {
        p.create = permissions.matchUsername();
    }
    if (p.edit) {
        p.edit = permissions.edit([
            permissions.fieldUneditable(),
            p.edit
        ]);
    }
    else {
        p.edit = permissions.fieldUneditable();
    }
    options.widget = options.widget || widgets.hidden();
    options.default_value = options.default_value || function (req) {
        return (req.userCtx && req.userCtx.name) || '';
    };
    options.required = options.required || false;
    return exports.string(options);
};


exports.timestamp = function (options) {
    options = options || {};
    if (!options.permissions) {
        options.permissions = {};
    }
    var p = options.permissions;
    if (p.edit) {
        p.edit = permissions.all([
            permisions.fieldUneditable(),
            p.edit
        ]);
    }
    else {
        p.edit = permissions.fieldUneditable();
    }
    options.widget = options.widget || widgets.hidden();
    options.default_value = options.default_value || function (req) {
        return new Date().getTime();
    };
    return exports.number(options);
};


exports.choice = function (options) {
    if (!options.validators) {
        options.validators = [];
    }
    options.validators.unshift(function (doc, value) {
        for (var i = 0; i < options.values.length; i++) {
            if (value === options.values[i][0]) {
                return;
            }
        }
        throw new Error('Invalid choice');
    });
    options.widget = options.widget || widgets.select({values: options.values});
    return new Field(options);
};


exports.numberChoice = function (options) {
    options.parse = exports.parseNumber;
    if (!options.validators) {
        options.validators = [];
    }
    options.validators.unshift(function (doc, value) {
        if (isNaN(value)) {
            throw new Error('Not a number');
        }
    });
    return exports.choice(options);
};

function Embedded(options) {
    var obj = new Field(options);
    obj.constructor = Embedded;
    obj.type = options.type;
    return obj;
};

exports.embed = function (options) {
    var type = options.type;
    if (!options.permissions) {
        options.permissions = {};
    }
    var p = options.permissions;
    p.create = p.create || permissions.inherit(type);
    p.delete = p.delete || permissions.inherit(type);
    p.edit = p.edit || permissions.inherit(type);

    if (!options.validators) {
        options.validators = [];
    }
    options.validators.unshift(function (doc, value) {
        type.validate(value);
    });

    /*options.widget = widgets.embeddedForm({
        form: new forms.Form(options.type)
    });*/

    return new Embedded(options);
};

exports.embedList = function (options) {

};
