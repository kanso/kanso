# Kanso CouchApps

Kanso is a framework for creating web applications which run on
[CouchDB](http://couchdb.org). You don't need anything else in your stack,
meaning apps are easy to deploy and easy to distribute.

The Kanso framework was designed for __rapid development__ and __code
maintainability__. Because it only requires CouchDB to host an app, you
can write web apps which run on __Windows, Mac, Linux, and even mobile devices!__

[Start the tutorial &gt;&gt;](guides/getting_started.html)


## Easy Schemas

<pre><code class="javascript">exports.author = new Type('author', {
    fields: {
        age:  fields.number(),
        name: fields.string(),
        web:  fields.url()
    }
});
</code></pre>

Kanso ships with a number of tools to make defining your data model as easy
as possible. The Types system provides powerful functions for document
validation and permissions checks. Even allowing you to embed document types
within each other! This system is incredibly flexible, and designed
__specifically__ for working with CouchDB.


## Admin Interface

<img src="guides/images/describing_the_data5.png" alt="Admin interface" />

To help you get your app off the ground, Kanso provides an admin interface
which can understand your data model and provide easy forms for getting data
into the system and seeing how it fits together.


## CommonJS Environment

<pre><code class="javascript">var types = require('kanso/types'),
    mymodule = require('./mymodule');


// public function
exports.hello = function () {
    return "Hello World!";
};
</code></pre>

With Kanso, you work in a clean and maintainable environment structured as
JavaScript modules. If you've ever worked with CouchApps directly,
you may have wrestled with magic comments for including files and an unwieldy
directory structure from which a JSON document is generated. Now, you can
just <code>require()</code> modules to reference them, and organise files however
you like!


## Runs in the Browser!

<em>
Tired of writing the same code over and over again? Often in two different
programming languages? 
</em>

<pre><code class="javascript">function validate(val) {
    if (val.length > 10) {
        throw new Error('Too long!');
    }
}
</code></pre>

<pre><code class="python">def validate(val):
    if len(val) > 10:
        raise ValueError('Too long!')
</code></pre>

Kanso provides the *same* environment server-side and client-side.
That means you can run the *same* field validation at either end,
render the *same* templates dynamically in the client or pre-render on the
server.

Kanso automatically runs your code client-side when possible, and on CouchDB
when JavaScript is not available. Helping you to write responsive web-interfaces
without the overhead.


## Search-Engine Friendly

Kanso makes it easy to write CouchApps which go beyond the "single-page" AJAX app.
You get clean URLs which point to server-rendered pages containing your core
content, making it easy for search-engines to index and providing a useful
fall-back.

You shouldn't need to break the web with "hash-bang" URLs that won't work at all
in a browser without JavaScript. You should be able to describe fall-backs easily,
then enhance the experience client-side.


<div class="next">
  <a class="call" href="guides/getting_started.html">Start the tutorial</a>
  or <a class="watch" href="https://github.com/caolan/kanso">Watch on GitHub</a>
</div>
