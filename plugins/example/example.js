exports.summary = 'Summary of example command';
exports.usage = '' +
'kanso example [ARGS]n' +
'\n' +
'Parameters:\n'
'  ARGS   example arguments';

exports.run = function (settings, args) {
    console.log('kansorc settings');
    console.log(settings);
    console.log('example command args');
    console.log(args);
};
