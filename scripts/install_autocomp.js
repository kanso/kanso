#!/usr/bin/env node

var os = require('os'),
    fs = require('fs');


var KANSO_DIR = process.argv[2] || '/usr/local/lib/node_modules/kanso'
var HOME = process.env.HOME;

var bash_profile = HOME + '/.bash_profile';
try {
    fs.statSync(bash_profile);
}
catch (e) {
    // OSX 10.6 apparently uses ".profile", try that instead
    bash_profile = HOME + '/.profile';
}
var bashrc = HOME + '/.bashrc';


var sourcebash = [
  '\nif [ -f ~/.bashrc ]; then',
  '  source ~/.bashrc',
  'fi'
].join('\n');


var sourceauto = [
  '\n#KANSO: Custom tab completion',
  'export KANSO_DIR="' + KANSO_DIR + '"',
  'shopt -s progcomp',
  'if [ -f ' + KANSO_DIR + '/scripts/autocomp.sh ]; then',
  '  source ' + KANSO_DIR + '/scripts/autocomp.sh',
  'fi'
].join('\n');


if (os.type() === 'Darwin') {
    fs.readFile(bash_profile, function (err, data) {
        data = data.toString();
        var identifier = data.indexOf('source ' + bashrc);
        if (identifier === -1) {
            fs.writeFile(bash_profile, data + sourcebash, function (err) {
                if (err) {
                    throw err;
                }
                return console.log(
                    'Successfully sourced ".bashrc" into ".bash_profile".'
                );
            });
        };
    });
}

fs.readFile(bashrc, function (err, data) {
    data = data.toString();
    var identifier = data.indexOf('#KANSO:');
    if (identifier === -1) {
        fs.writeFile(bashrc, data + sourceauto, function (err) {
            if (err) {
                throw err;
            }
            return console.log(
                'Successfully installed source to ".bashrc".\n'
            );
        });
    }
});
