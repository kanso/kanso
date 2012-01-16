exports.summary = 'Updates a package to the latest compatible version';


exports.usage = '' +
'kanso update [PACKAGES ...]\n' +
'\n' +
'Parameters:\n' +
'  PACKAGES    Names of specific packages to update\n' +
'\n' +
'Options:\n' +
'  --repository   Source repository URL (otherwise uses settings in kansorc)\n' +
'  --package-dir  Package directory (defaults to "./packages")';


exports.run = function (_settings, args) {
    console.log('update');
};
