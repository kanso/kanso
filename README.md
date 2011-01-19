# KansoJS


The surprisingly simple way to write [CouchApps](http://couchapp.org).

* __Flexible__ - a lightweight CommonJS environment
* __Reduces code fragmentation__ - by bringing the client-side and server-side together
* __Automatic history support__ - adds pushState and hash-based URLs automatically
* __Searchable and degradable__ - add Google-indexable pages and support clients without JavaScript
* __Familiar__ - all this can be done by using the CouchDB design doc APIs

[Read more...](http://kansojs.org)

------------------

With a normal CouchApp, you define the behaviour of your app in a design
document which you push to CouchDB. This can describe URL patterns,
validation rules and even respond dynamically to requests using show and
list functions.

This allows CouchDB to communicate with the browser according to the rules
defined in your design document. Being able to host an application
directly from CouchDB removes a whole layer from your stack, and is one of
the main attractions of using a CouchApp.

To do more complex operations and provide a nicer interface, CouchApps
usually involve a lot of client-side code. This means repeating lots of
logic from the design document using Sammy.js, Evently or a number of
other JavaScript frameworks. 

**This isn't very DRY!**

But wait a moment! The design doc is just JSON and our functions stored
there are plain JavaScript... with a little work it should be possible to
implement much of the design doc's API, in the browser. Meaning we can
re-use our functions and cut out the extra client-side code!

The simple idea behind Kanso is to support the design doc API in the
browser. You're already defining much of the application's behaviour in
the design doc, why should you have to redefine it all over again?

[Read more...](http://kansojs.org)
