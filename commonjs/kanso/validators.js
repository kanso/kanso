var _ = require('./underscore')._;


exports.min = function (min) {
    return function (doc, value) {
        if (value < min) {
            throw new Error(
                'Please enter a value greater than or equal to ' + min
            );
        }
    };
};

exports.max = function (max) {
    return function (doc, value) {
        if (value > max) {
            throw new Error(
                'Please enter a value less than or equal to ' + max
            );
        }
    };
};

exports.range = function (min, max) {
    return function (doc, value) {
        if (value < min || value > max) {
            throw new Error(
                'Please enter a value between ' + min + ' and ' + max
            );
        }
    };
};

exports.minlength = function (val) {
    return function (doc, value) {
        if (value.length < val) {
            throw new Error('Please enter at least ' + val + ' characters');
        }
    };
};

exports.maxlength = function (val) {
    return function (doc, value) {
        if (value.length > val) {
            throw new Error('Please enter no more than ' + val + ' characters');
        }
    };
};

exports.rangelength = function (min, max) {
    return function (doc, value) {
        if (value.length < min || value.length > max) {
            throw new Error(
                'Please enter a value between ' + min + ' and ' + max +
                ' characters long'
            );
        }
    };
};

exports.regexp = function (re, message) {
    re = (typeof re === 'string') ? new RegExp(re): re;
    return function (doc, value) {
        if (!re.test(value)) {
            throw new Error(message || 'Invalid format');
        }
    };
};

exports.email = function () {
    // regular expression by Scott Gonzalez:
    // http://projects.scottsplayground.com/email_address_validation/
    return exports.regexp(new RegExp("^((([a-z]|\\d|[!#\\$%&'\\*\\+\\-\\/=\\?\\^_`{\\|}~]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])+(\\.([a-z]|\\d|[!#\\$%&'\\*\\+\\-\\/=\\?\\^_`{\\|}~]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])+)*)|((\\x22)((((\\x20|\\x09)*(\\x0d\\x0a))?(\\x20|\\x09)+)?(([\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]|\\x21|[\\x23-\\x5b]|[\\x5d-\\x7e]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(\\\\([\\x01-\\x09\\x0b\\x0c\\x0d-\\x7f]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]))))*(((\\x20|\\x09)*(\\x0d\\x0a))?(\\x20|\\x09)+)?(\\x22)))@((([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])*([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])))\\.)+(([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])*([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])))\\.?$", "i"), 'Please enter a valid email address');
};

exports.url = function () {
    // regular expression by Scott Gonzalez:
    // http://projects.scottsplayground.com/iri/
    return exports.regexp(new RegExp("^(https?|ftp):\\/\\/(((([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:)*@)?(((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5]))|((([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])*([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])))\\.)+(([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])*([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])))\\.?)(:\\d*)?)(\\/((([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:|@)+(\\/(([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:|@)*)*)?)?(\\?((([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:|@)|[\\uE000-\\uF8FF]|\\/|\\?)*)?(\\#((([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:|@)|\\/|\\?)*)?$", "i"), 'Please enter a valid URL');
};

/**
 * Detects embedded documents with missing _id properties and returns an
 * array of Error objects for each occurence. Returns an empty array if
 * all documents have a populated _id property.
 *
 * Used by the EmbeddedList field type.
 *
 * @param {Object} doc
 * @param {Array} value
 * @return {Array}
 * @api public
 */

exports.missingIDs = function () {
    return function (doc, value) {
        var errs = []
        _.each(value, function (v, i) {
            if (!v._id) {
                var e = new Error('Embedded document missing _id');
                e.field = [i];
                errs.push(e);
            }
        });
        return errs;
    };
};
