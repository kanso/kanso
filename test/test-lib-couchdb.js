var couchdb = require('../lib/couchdb');


exports['default ports if none specified'] = function (test) {
    var db = new couchdb.CouchDB('http://hostname/dbname');
    test.equal(db.instance.port, 80);
    var db2 = new couchdb.CouchDB('https://hostname/dbname2');
    test.equal(db2.instance.port, 443);
    test.done();
};
