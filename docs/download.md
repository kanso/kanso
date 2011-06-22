# Installing Kanso


## Requirements

To use Kanso you'll need to install the latest _stable_ version of node.js,
which can be found at [http://nodejs.org](http://nodejs.org).

### Why does Kanso need node.js?

Node.js is used for the command-line tools only. With Kanso, the end result is
a pure [CouchApp](http://couchapp.org) you can host using CouchDB alone.
Using node to write the associated tools allows us to do some powerful things
by interpreting the JavaScript of your application.


## Install using Git

This is the preferred method of installing Kanso. First, clone the repository
from GitHub:

<pre><code class="no-highlight">git clone git://github.com/caolan/kanso.git
cd kanso</code></pre>

Then you'll need to fetch its dependencies using git submodules:

    git submodule init
    git submodule update

Next, install using make:

    make && sudo make install


## Using NPM

If you already have node.js installed, and you're using npm
(Node Package Manager), then you can install by simply doing the following:

<pre><code class="no-highlight">sudo npm install -g kanso</code></pre>


## CouchDB version

As of release 0.0.7, Kanso **only supports CouchDB 1.1.0 or higher**. This is due
to a number of fixes in CouchDB 1.1.0 for CommonJS modules which make Kanso
faster and helps to keep the framework code clean. If you're running an older
version of CouchDB you'll want to upgrade it before continuing.
