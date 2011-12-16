/**
 * The public kanso API
 */


/**
 * Module dependencies
 */

var path = require('path'),
    fs = require('fs');


// Assume that everything in ./kanso/* is public. Loop through each filenename
// and export it.
var api_directory = path.join(__dirname, 'kanso');
var filenames = fs.readdirSync(api_directory);

for (var i = 0; i < filenames.length; i++) {
    var filename = filenames[i],
        require_label = './kanso/' + filename,
        module_name   = path.basename(filename, '.js');

    // It might be wise to lstat and look for files ending in ".js" or any
    // directory. But I'm unsure if that's Windows-compatible. This test
    // filters out Vim .swp files, or whatever randomness gets in there.
    if(filename.match(/\.js$/) || filename.match(/^[a-z]+$/)) {
        exports[module_name] = require(require_label);
    }
}
