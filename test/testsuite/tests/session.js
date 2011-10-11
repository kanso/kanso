var session = require('kanso/session'),
    db = require('kanso/db'),
    async = require('async'),
    _ = require('underscore')._;

var deleteUser = function(username, test, callback) {
    db.deleteUser(username, function(err) {
        if (err) {
            test.done(err);
        } else {
            callback();
        }
    });    
};

exports['signup'] = function (test)
{
    test.expect(5);

    async.waterfall([
        function (callback) {
            session.signup('wizard_of_oz', 'password', function(err, user) {
                if (err) {
                    test.done(err);
                }
                test.equal(err, undefined, 'signup has no error');
                test.notEqual(user, undefined, 'signup returns a value');
                test.equal(user.ok, true, 'signup returns okay');
                callback();
            });
        },
        function (callback) {
            session.signup('wicked_with_of_the_east', 'password', ['witch'], function(err, user) {
                if (err) {
                    test.done(err);
                }
                
                session.userDb(function (err, userdb) {
                    if (err) {
                        test.done(err);
                    }
                    
                    var url = '/' + userdb + '/' + user.id;
                    var req = {
                        type: 'GET',
                        url: url,
                        processData: false,
                        contentType: 'application/json'
                    };
                    db.request(req, function(err, user) {
                        if (err) {
                            test.done(err);
                        }
                        test.equal(user.roles[0], "witch");
                        callback();
                    });
                });
            });            
        },
        function (callback) {
            session.signup('tin_woodman', 'password', ['_admin'], function(err, user) {
                if (err) {
                    test.done(err);
                }
                
                db.request({
                    type: 'GET',
                    url: '/_config/admins/tin_woodman',
                    contentType: 'application/json'                
                }, function(err, admin) {
                    if (err) {
                        test.done(err);
                    }
                    
                    test.notEqual(admin, undefined, 'tin_woodman should be an admin');
                    callback();
                });
            });
        },
        function (callback) {
            deleteUser('wizard_of_oz', test, function() {
                deleteUser('tin_woodman', test, function() {
                    deleteUser('wicked_with_of_the_east', test, callback);
                });
            });
        }
    ], function () {
        test.done();
    });
};
            