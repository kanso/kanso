var testing = require('../lib/testing'),
    nodeunit = require('../deps/nodeunit');


var context = {window: {}, kanso: {design_doc: {}}, console: console};
var mcache = {};

module.exports = nodeunit.testCase({

    setUp: function (cb) {
        var that = this;
        testing.testRequire(
            'kanso/validators', mcache, context, {}, function (err, v) {
                if (err) {
                    return cb(err);
                }
                that.validators = v;
                cb();
            }
        );
    },

    /*
    exports['matchField'] = function(test){
        var v = validators.matchField('field1');
        var data = {
            fields: {
                field1: {data: 'one'},
                field2: {data: 'two'}
            }
        };
        v(data, data.fields.field2, function(err){
            test.equals(err, 'Does not match field1');
            data.fields.field2.data = 'one';
            v(data, data.fields.field2, function(err){
                test.equals(err, undefined);
                test.done();
            });
        });
    };
    */

    'min': function (test) {
        test.expect(1);
        try {
            this.validators.min(100)('doc', 50, 50);
        }
        catch (e) {
            test.equal(
                e.message, 'Please enter a value greater than or equal to 100'
            );
        }
        // this should not throw an error
        this.validators.min(100)('doc', 100, 100);
        test.done();
    },

    'max': function (test) {
        test.expect(1);
        try {
            this.validators.max(100)('doc', 150, 150);
        }
        catch (e) {
            test.equal(
                e.message, 'Please enter a value less than or equal to 100'
            );
        }
        // this should not throw an error
        this.validators.max(100)('doc', 100, 100);
        test.done();
    },

    'range': function (test) {
        test.expect(1);
        try {
            this.validators.range(10, 20)('doc', 50, 50);
        }
        catch (e) {
            test.equals(e.message, 'Please enter a value between 10 and 20');
        }
        // this should not throw an error
        this.validators.range(10, 20)('doc', 15, 15);
        test.done();
    },

    'regexp': function(test){
        test.expect(2);
        try {
            this.validators.regexp(/^\d+$/)('doc', 'abc123', 'abc123');
        }
        catch (e) {
            test.equals(e.message, 'Invalid format');
        }
        // this should not throw
        this.validators.regexp(/^\d+$/)('doc', '123', '123');

        // custom error message
        var v = this.validators.regexp('^\\d+$', 'my message');
        try {
            v('doc', 'abc123', 'abc123');
        }
        catch (e2) {
            test.equals(e2.message, 'my message');
        }
        test.done();
    },

    'email': function (test) {
        test.expect(1);
        try {
            this.validators.email()('doc', 'asdf', 'asdf');
        }
        catch (e) {
            test.equals(e.message, 'Please enter a valid email address');
        }
        // this should not throw
        this.validators.email()('doc', 'asdf@asdf.com', 'asdf@asdf.com');
        this.validators.email()('doc', 'a←+b@f.museum', 'a←+b@f.museum');
        test.done();
    },

    'url': function (test) {
        test.expect(1);
        try {
            this.validators.url()('doc', 'asdf.com', 'asdf.com');
        }
        catch (e) {
            test.equals(e.message, 'Please enter a valid URL');
        }
        this.validators.url()('doc', 'http://asdf.com', 'http://asdf.com');
        test.done();
    },

    'minlength': function (test) {
        test.expect(1);
        try {
            this.validators.minlength(5)('doc', '1234', '1234');
        }
        catch (e) {
            test.equals(e.message, 'Please enter at least 5 characters');
        }
        // this should not throw
        this.validators.minlength(5)('doc', '12345', '12345');
        test.done();
    },

    'maxlength': function (test) {
        try {
            this.validators.maxlength(5)('doc', '123456', '123456');
        }
        catch (e) {
            test.equals(e.message, 'Please enter no more than 5 characters');
        }
        // this should not throw
        this.validators.maxlength(5)('doc', '12345', '12345');
        test.done();
    },

    'rangelength': function (test) {
        test.expect(2);
        try {
            this.validators.rangelength(2,4)('doc', '12345', '12345');
        }
        catch (e) {
            test.equals(
                e.message,
                'Please enter a value between 2 and 4 characters long'
            );
        }
        try {
            this.validators.rangelength(2,4)('doc', '1', '1');
        }
        catch (e) {
            test.equals(
                e.message,
                'Please enter a value between 2 and 4 characters long'
            );
        }
        // this should not throw
        this.validators.rangelength(2,4)('doc', '12', '12');
        this.validators.rangelength(2,4)('doc', '1234', '1234');
        test.done();
    }

});
