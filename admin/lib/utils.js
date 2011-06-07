/*global $: false */

exports.capitalize = function (str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
};

exports.typePlural = function (type) {
    // capitalize and make plural
    // TODO: add django-style admin panel for custom setting of plurals
    return type.replace(/_/g, ' ') + 's';
};

exports.typeHeading = function (type) {
    return exports.capitalize(exports.typePlural(type.replace(/_/g, ' ')));
};

exports.viewHeading = function (view) {
    return exports.capitalize(view.replace(/_/g, ' '));
};

