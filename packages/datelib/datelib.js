// Thanks to underscore.js for this method

exports.isDate = function(obj) {
    return !!(obj && obj.getTimezoneOffset && obj.setUTCFullYear);
};


/*
 * Takes an ISO time or Date object and returns a string representing how
 * long ago the date represents in human-friendly terms. If the date is over one
 * month ago, returns the date in the form YYYY-MM-DD
 *
 * Adapted from John Resig's prettyDate function:
 * http://ejohn.org/blog/javascript-pretty-date/
 */

exports.prettify = function (d) {
    if (typeof d === 'string') {
        d = new Date(d);
    }
    var now = new Date(),
        diff = ((now.getTime() - d.getTime()) / 1000),
        day_diff = Math.floor(diff / 86400);

    if (isNaN(day_diff) || day_diff < 0) {
        return;
    }

    if (day_diff === 0) {
        if (diff < 60)    return "just now";
        if (diff < 120)   return "1 minute ago";
        if (diff < 3600)  return Math.floor( diff / 60 ) + " minutes ago";
        if (diff < 7200)  return "1 hour ago";
        if (diff < 86400) return Math.floor( diff / 3600 ) + " hours ago";
    }
    if (day_diff === 1) return "yesterday";
    if (day_diff < 7)   return day_diff + " days ago";
    if (day_diff < 31)  return Math.ceil( day_diff / 7 ) + " weeks ago";

    var yyyy = d.getFullYear();
    var mm = d.getMonth();
    var dd = d.getDate();

    return yyyy + '-' + mm + '-' + dd;
};

/**
 * Returns an ISO date string from a Date object
 */

exports.ISODateString = function (d) {
    if (!d) {
        // default to current time
        var d = new Date();
    }
    function pad(n){
        return n < 10 ? '0' + n : n;
    }
    return d.getUTCFullYear() + '-' +
        pad(d.getUTCMonth() + 1) + '-' +
        pad(d.getUTCDate()) + 'T' +
        pad(d.getUTCHours()) + ':' +
        pad(d.getUTCMinutes()) + ':' +
        pad(d.getUTCSeconds()) + 'Z';
};
