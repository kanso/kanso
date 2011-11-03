#!/usr/bin/env node

//var logger = require('kanso/logger');
//logger.clean_exit = true;
//var commands = require(__dirname + '/../src/kanso/commands');
//var cmd_names = Object.keys(commands);

// TODO: the above code is too slow for auto-complete, generate a list of
// command names when doing make for use by autocomplete.js
var cmd_names = ['push', 'upload'];

var commands = process.argv.slice(3);

// list all commands
if (commands.length === 0) {
    process.stdout.write(cmd_names.join('\n'));
}
// complete first command
else if (commands.length === 1) {
    var curr = commands[commands.length - 1];
    var matches = [];
    cmd_names.forEach(function (name) {
        if (name.indexOf(curr) === 0) {
            matches.push(name);
        }
    });
    if (matches.length === 1 && matches[0] === curr) {
        // the command is already complete
        return;
    }
    process.stdout.write(matches.join('\n'));
}
