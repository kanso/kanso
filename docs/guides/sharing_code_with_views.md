# Sharing Code With Views

As of CouchDB 1.1.0, its possible to share code between views
(map/reduce functions) and other parts of your couchapp by putting the modules
in the <code>views/lib</code> directory. To add a new directory of modules in
Kanso, you need to edit the kanso.json configuration file, so it looks something
like the following:

<pre><code class="javascript">{
    "name": "myapp",
    "load": "lib/app",
    "modules": ["lib", "views"],
    "templates": "templates",
    "attachments": "static"
}</code></pre>

Note that you can use either a single string or an array of strings to represent
modules directories (same goes for attachments). Once you've added the views
directory to kanso.json, create the <code>views</code> and <code>views/lib</code>
and add your shared module code in there:


## views/lib/example.js

<pre><code class="javascript">exports.fn = function () {
    return 42;
};</code></pre>


## Using shared modules

When using a module inside a view, you need to remember that views are not
context-aware like list, show or update functions. They do not have access to
their surrounding scope. Each map or reduce function needs to be completely
self-contained so CouchDB can detect when it has changed and update the index.
Because of this, you need to make sure you require the shared module inside the
function:

<pre><code class="javascript">exports.example_view = {
    map: function (doc) {
        // this must be placed *inside* the map function
        var example = require('views/lib/example');
        if (doc.num) {
            emit(doc._id, example.fn());
        }
    }
};</code></pre>

After pushing these changes and making sure you have some example documents,
requesting this view should give results similar to the following:

<pre><code class="javascript">{
    "total_rows": 2,
    "offset": 0,
    "rows": [
        {
            "id": "cfe0bf4ac09fd7cf1efad645d2abf376",
            "key": "cfe0bf4ac09fd7cf1efad645d2abf376",
            "value": 42
        },
        {
            "id": "cfe0bf4ac09fd7cf1efad645d2abfd85",
            "key": "cfe0bf4ac09fd7cf1efad645d2abfd85",
            "value": 42
        }
    ]
}</code></pre>

The value of each row is the result of calling <code>example.fn()</code>. In
other modules in your application, you can require the new example module by
doing <code>require('views/lib/example')</code>.

One thing to be aware of, is that changes to the new module will trigger a
re-indexing of the relevant views. Make sure you only put code essential to
your views inside the <code>views/lib</code> directory.
