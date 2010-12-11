var templates = require('templates');

exports.template = function (name, context) {
    var r = '';
    templates.render(name, context, function (err, result) {
      if (err) throw err;
      r = result;
    });
    return r;
};
