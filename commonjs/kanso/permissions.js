var utils = require('./utils');


exports.matchUsername = function () {
    return function (newDoc, oldDoc, newVal, oldVal, userCtx) {
        var name = userCtx.name;
        if (name !== newVal) {
            // if both are empty-like, then consider them the same
            if ((name !== null && name !== undefined && name !== '') ||
                (newVal !== null && newVal !== undefined && newVal !== '')) {
                throw new Error('Field does not match your username');
            }
        }
    };
};

exports.fieldUneditable = function () {
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
        var field = utils.getPropertyPath(oldDoc, path);
        if (userCtx.name !== field) {
            throw new Error('Username does not match field ' + path.join('.'));
        }
    };
};

exports.loggedIn = function () {
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        if (!userCtx.name) {
            throw new Error('You must be logged in');
        }
    };
};
