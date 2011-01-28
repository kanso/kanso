var jsp = require('../deps/UglifyJS/lib/parse-js'),
    pro = require('../deps/UglifyJS/lib/process');


exports.minify = function (src) {
    var ast = jsp.parse(src);   // parse code and get the initial AST
    ast = pro.ast_mangle(ast);  // get a new AST with mangled names
    ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
    return pro.gen_code(ast);   // compressed code here
};
