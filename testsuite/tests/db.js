
var db = require('kanso/db'),
    utils = require('kanso/utils'),
    async = require('lib/async');


exports['database creation'] = function(test)
{
  db.createDatabase('kanso_testsuite_database', function(err_c, rv_c) {
    test.expect(6);
    test.equal(err_c, undefined, 'Created database successfully');
    test.notEqual(rv_c, undefined, 'Return value is defined');
    test.equal(rv_c.ok, true, 'createDatabase returns okay');

    db.deleteDatabase('kanso_testsuite_database', function(err_d, rv_d) {
      test.equal(err_d, undefined, 'Deleted database successfully');
      test.notEqual(rv_d, undefined, 'Return value is defined');
      test.equal(rv_d.ok, true, 'deleteDatabase returns okay');
      test.done();
    });
  });
};

/* A deeply-nested version; no async.js dependency */
exports['simple replication, no async'] = function(test)
{
  test.expect(8);

  /* Create databases */
  db.createDatabase('kanso_testsuite_source', function(e1, r1) {
    test.equal(r1.ok, true, 'first createDatabase returns okay');

    db.createDatabase('kanso_testsuite_target', function(e2, r2) {
      test.equal(r2.ok, true, 'second createDatabase returns okay');

      /* Start replication */
      db.replicate(
        { source: 'kanso_testsuite_source',
          target: 'kanso_testsuite_target',
          create_target: false, continuous: true },

        function(err_start, rv_start) {
          test.equal(err_start, undefined, 'No error starting replication');
          test.notEqual(rv_start.id, undefined, 'Replication job ID defined');

          /* Stop replication: Should retry by default */
          db.stopReplication(
            { _id: rv_start.id, _rev: rv_start.rev },

            function(err_stop, rv_stop) {
              test.equal(err_stop, undefined, 'No error while stopping replication');
              test.equal(rv_stop.ok, true, 'stopReplication returns');

              /* Delete databases */
              db.deleteDatabase('kanso_testsuite_source', function(e3, r3) {
                test.equal(r3.ok, true, 'first deleteDatabase returns okay');

                db.deleteDatabase('kanso_testsuite_target', function(e4, r4) {
                  test.equal(r4.ok, true, 'second deleteDatabase returns okay');
                  test.done();
                });
              });
            }
          );
      });
    });
  });
};

/* Same as above, but using async.js */
exports['simple replication, async'] = function(test)
{
  test.expect(8);

  async.waterfall([
    function(callback) {
      db.createDatabase('kanso_testsuite_source', function(err, rv) {
        test.equal(rv.ok, true, 'first createDatabase returns okay');
        callback();
      });
    },
    function(callback) {
      db.createDatabase('kanso_testsuite_target', function(err, rv) {
        test.equal(rv.ok, true, 'second createDatabase returns okay');
        callback();
      });
    },
    function(callback) {
      db.replicate(
        { source: 'kanso_testsuite_source',
          target: 'kanso_testsuite_target',
          create_target: false, continuous: true },

        function(err, rv) {
          test.equal(err, undefined, 'No error starting replication');
          test.notEqual(rv.id, undefined, 'Replication job ID is defined');
          callback(null, rv);
        }
      );
    },
    function(doc, callback) {
      db.stopReplication(
        { _id: doc.id, _rev: doc.rev },

        function(err_stop, rv_stop) {
          test.equal(err_stop, undefined, 'No error stopping replication');
          test.equal(rv_stop.ok, true, 'stopReplication returns okay');
          callback();
        }
      );
    },
    function(callback) {
      db.deleteDatabase('kanso_testsuite_target', function(err, rv) {
        test.equal(rv.ok, true, 'first deleteDatabase returns okay');
        callback();
      });
    },
    function(callback) {
      db.deleteDatabase('kanso_testsuite_source', function(err, rv) {
        test.equal(rv.ok, true, 'second deleteDatabase returns okay');
        callback();
      });
    },
  ], function() {
    test.done();
  });

};

exports['once-only replication, async'] = function(test)
{
  test.expect(14);

  /* Discover what database we're living inside of */
  source_database = (utils.getBaseURL().slice(1).split('/'))[0];

  async.waterfall([
    function(callback) {
      db.createDatabase('kanso_testsuite_target1', function(err, rv) {
        test.equal(rv.ok, true, 'first createDatabase returns okay');
        callback();
      });
    },
    function(callback) {
      db.createDatabase('kanso_testsuite_target2', function(err, rv) {
        test.equal(rv.ok, true, 'second createDatabase returns okay');
        callback();
      });
    },
    function(callback) {
      db.replicate(
        { source: source_database,
          target: 'kanso_testsuite_target1',
          create_target: false, continuous: false },

        function(err, rv) {
          test.equal(err, undefined, 'No error starting replication');
          test.notEqual(rv.id, undefined, 'Replication job ID is defined');
          callback(null, rv);
        }
      );
    },
    function(doc1, callback) {
      db.replicate(
        { source: source_database,
          target: 'kanso_testsuite_target2',
          create_target: false, continuous: false },

        function(err, rv) {
          test.equal(err, undefined, 'No error starting replication');
          test.notEqual(rv.id, undefined, 'Replication job ID is defined');
          callback(null, doc1, rv);
        }
      );
    },
    function(doc1, doc2, callback) {
      db.getReplication(
        doc1.id,
        function(err, rv) {
          test.equal(err, undefined, 'No error getting replication #1');
          test.notEqual(rv._id, undefined, 'getReplication #1 has id');
          test.notEqual(rv._rev, undefined, 'getReplication #1 has rev');
          callback(null, doc2);
        }
      );
    },
    function(doc2, callback) {
      db.getReplication(
        doc2.id,
        function(err, rv) {
          test.equal(err, undefined, 'No error getting replication #2');
          test.notEqual(rv._id, undefined, 'getReplication #2 has id');
          test.notEqual(rv._rev, undefined, 'getReplication #2 has rev');
          callback();
        }
      );
    },
    function(callback) {
      db.deleteDatabase('kanso_testsuite_target2', function(err, rv) {
        test.equal(rv.ok, true, 'first deleteDatabase returns okay');
        callback();
      });
    },
    function(callback) {
      db.deleteDatabase('kanso_testsuite_target1', function(err, rv) {
        test.equal(rv.ok, true, 'second deleteDatabase returns okay');
        callback();
      });
    },
  ], function() {
    test.done();
  });

};

