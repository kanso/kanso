
var db = require('kanso/db');


exports['database creation'] = function(test)
{
  db.createDatabase('kanso_testsuite_database', function(err_c, rv_c) {
    test.expect(6);
    test.equal(err_c, undefined, 'Error creating database');
    test.notEqual(rv_c, undefined, 'No return value');
    test.equal(rv_c.ok, true, 'createDatabase did not return okay');

    db.deleteDatabase('kanso_testsuite_database', function(err_d, rv_d) {
      test.equal(err_d, undefined, 'Error deleting database');
      test.notEqual(rv_d, undefined, 'No return value');
      test.equal(rv_d.ok, true, 'deleteDatabase did not return okay');
      test.done();
    });
  });
};

exports['simple replication, no async'] = function(test)
{
  test.expect(8);

  /* Create databases */
  db.createDatabase('kanso_testsuite_source', function(e1, r1) {
    test.equal(r1.ok, true, 'first createDatabase did not return okay');

    db.createDatabase('kanso_testsuite_target', function(e2, r2) {
      test.equal(r2.ok, true, 'second createDatabase did not return okay');

      /* Start replication */
      db.replicate(
        { source: 'kanso_testsuite_source',
          target: 'kanso_testsuite_target',
          create_target: false, continuous: true },

        function(err_start, rv_start) {
          test.equal(err_start, undefined, 'Error starting replication');
          test.notEqual(rv_start.id, 'No replication job ID returned');

          /* Stop replication: Should retry by default */
          db.stopReplication(
            { _id: rv_start.id, _rev: rv_start.rev },

            function(err_stop, rv_stop) {
              test.equal(err_stop, undefined, 'Error while stopping replication');
              test.equal(rv_stop.ok, true, 'stopReplication did not return okay');

              /* Delete databases */
              db.deleteDatabase('kanso_testsuite_source', function(e3, r3) {
                test.equal(r3.ok, true, 'first createDatabase did not return okay');

                db.deleteDatabase('kanso_testsuite_target', function(e4, r4) {
                  test.equal(r4.ok, true, 'second deleteDatabase did not return okay');
                  test.done();
                });
              });
            }
          );
      });
    });
  });
};

exports['simple replication, async'] = function(test)
{
  test.done();
};

