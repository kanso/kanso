/**
 * Module dependencies
 */

var _ = require('./underscore'),
    utils = require('./utils');


/**
 * Returns a hierachy of default values for a given set of Field objects
 *
 * @param {Object} fields
 * @return {Object}
 * @api public
 */

exports.createDefaults = function (fields, userCtx) {
    return _.reduce(_.keys(fields), function (result, k) {
        var f = fields[k];
        var cname = utils.constructorName(f);
        if (cname === 'Field' ||
            cname === 'Embedded' ||
            cname === 'EmbeddedList') {
            if (f.hasOwnProperty('default_value')) {
                if (_.isFunction(f.default_value)) {
                    result[k] = f.default_value(userCtx);
                }
                else {
                    result[k] = f.default_value;
                }
            }
        }
        else {
            result[k] = exports.createDefaults(f);
        }
        return result;
    }, {});
};
