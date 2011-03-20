var utils = require('./utils');


exports.matchUsername = function () {
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        if (userCtx.name !== newValue) {
            throw new Error('Field does not match your username');
        }
    };
};

exports.uneditable = function () {
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        if (oldDoc) {
            if (newValue !== oldValue) {
                throw new Error('Field cannot be edited once created');
            }
        }
    };
};

exports.usernameMatchesField = function (path) {
    if (!utils.isArray(path)) {
        path = [path];
    }
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        var field = utils.getPropertyPath(newDoc, path);
        if (userCtx.name !== field) {
            throw new Error('username does not match field: ' + path.join('.'));
        }
    };
};
