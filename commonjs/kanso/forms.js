/**
 * Module dependencies
 */

var utils = require('./utils');


/**
 * Transforms a flat object from a request query to a proper
 * hierarchy of properties.
 *
 * {'one.two': 'val'} --> {one: {two: 'val'}}
 *
 * @param {Object} query
 * @api public
 */

exports.formValuesToTree = function (form) {
    var tree = {};
    for (var k in form) {
        utils.setPropertyPath(tree, k.split('.'), form[k]);
    }
    return tree;
};


/**
 * Transforms a raw query object from formValuesToTree to a
 * document which follows the schema for the given type.
 *
 * @param {Type} type
 * @param {Object} raw
 * @return {Object}
 * @api public
 */

exports.parseRaw = function (fields, raw) {
    var doc = {};
    for (var k in fields) {
        var f = fields[k];
        var cname = utils.constructorName(f);
        if (cname === 'Field' ||
            cname === 'Embedded' ||
            cname === 'EmbeddedList') {

            if (!f.isEmpty(raw[k]) || !f.omit_empty) {
                doc[k] = f.parse(raw[k]);
            }
        }
        else {
            doc[k] = exports.parseRaw(f, raw[k]);
        }
    }
    return doc;
};
