![Kanso](http://kansojs.org/images/kanso.png)

The write-once, run both ends framework for pure CouchApps.

By implementing and extending the CouchDB API in the browser, Kanso lets you write
your routing, rendering and validation functions once and have them run
client-side when possible, or on CouchDB as a fall-back.

This means highly-responsive web-apps, that are still search-engine friendly.

* __Website:__ [http://kansojs.org](http://kansojs.org)
* __Wiki:__ [https://github.com/caolan/kanso/wiki](https://github.com/caolan/kanso/wiki)
* __Issues:__ [https://github.com/caolan/kanso/issues](https://github.com/caolan/kanso/issues)
* __Mailing List:__ [http://groups.google.com/group/kanso](http://groups.google.com/group/kanso)
* __IRC:__ #kansojs on FreeNode

Kanso provides a whole host of tools for making serious CouchApp development easier,
to find out more about this new approach to web development take a look at the
[Kanso website](http://kansojs.org).

How to contribute
-----------------
1. Fork repository on GitHub.
2. Clone forked repository: `git clone git@github.com:_username_/kanso.git`
3. Add original remote repository: `git remote add upstream https://github.com/caolan/kanso.git`
4. Create and checkout dev branch: `cd kanso && git checkout -b dev origin/dev`
5. Create and checkout feature/bugfix branch: `git checkout -b _branch_ dev`
6. Get latest updates from the upstream dev branch: `git remote update && git pull upstream dev`
7. Setup for development: `make all && sudo npm link`
8. Create CouchDB database for Kanso (eg. kanso_testsuite).
9. Run tests and check that all pass: `kanso push http://_couchdb_host_/kanso_testsuite testsuite` and visit http://_couchdb_host_/kanso_testsuite/_design/testsuite/_rewrite/
10. Write tests in testsuite/tests
11. Write source (eg. in commonjs/kanso).
12. Run tests and check that all pass.
13. Save changes: `git add --all && git commit -m "_message_"
14. Create another feature/bugfix by following steps 4-13
    Merge feature/bugfix branch back to dev branch: `git checkout dev && git merge _branch_`
    Delete feature/bugfix branch: `git branch -d _branch_`
15. Push your changes to GitHub: `git push origin dev`
16. Make pull request for your forked repository's dev branch into the original repository's dev branch.