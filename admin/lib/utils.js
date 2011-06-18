/*global $: false */

exports.capitalize = function (str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
};

exports.typePlural = function (type) {
    // capitalize and make plural
    // TODO: add django-style admin panel for custom setting of plurals
    // Note: Rails has a nice set of built-in pluralization rules, too.
    // Consider using a rule set, and then allowing for exceptions.
    return type.replace(/_/g, ' ') + 's';
};

exports.typeHeading = function (type) {
    return exports.capitalize(exports.typePlural(type.replace(/_/g, ' ')));
};

exports.viewHeading = function (view) {
    return exports.capitalize(view.replace(/_/g, ' '));
};

