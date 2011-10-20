# Adding search engine friendly links.

In the getting started guide the links use the doc_id for reference.
This can be improved by using a readable link. Since this is also used in bookmarks and by search engines,
that can improve the site experience.
For this we need to change the type a bit, add a view, a list and change the blogposts template.

## Change the blogpost type

First we need to add a slug to the blogpost type.

<pre><code class="javascript">exports.blogpost = new Type('blogpost', {
    permissions: {
        add:    permissions.hasRole('_admin'),
        update: permissions.loggedIn(),
        remove: permissions.hasRole('_admin')
    },
    fields: {
        created: fields.createdTime(),
        title: fields.string({
            permissions: {
                update: permissions.hasRole('_admin')
            }
        }),
        slug: fields.string({
            permissions: {
                update: permissions.hasRole('_admin')
            }
        }),
        text: fields.string({
            widget: widgets.textarea({cols: 40, rows: 10}),
            permissions: {
                update: permissions.hasRole('_admin')
            }
        }),
        comments: fields.embedList({
            type: exports.comment,
            required: false
        })
    }
});</code></pre>

Now fill the slug for the blog posts you created earlier.
You can use a '-' or '_' for seperator instead of a space.
Also only use lowercase here.

## Add a view by slug

Next we need to create a new view for a lookup by slug.
This will be used later on to reference the documents instead of by id.
In the <code>lib/views.js</code> add the following:

<pre><code class="javascript">exports.blogposts_by_slug = {
    map: function (doc) {
        if (doc.type === 'blogpost') {
            emit([doc.slug], null);
        }
    }
};</code></pre>

You can check your view by opening the following url: <code>http://localhost:5984/myblog/_design/myblog/_rewrite/_db/_design/myblog/_view/blogposts_by_slug</code>
Don't worry, this is just a peek in the details and won't be used in your application.

## Add the list for the lookup

Now we have added the view and we need to replace the show function.
The show function is used to present a single document and parse that through the presentation template.
If we want to lookup the document by slug, then we can't use the show, but should use a list instead.
The list will parse a view and present that using the presentation template.
In this case we will only process the first document.

For this we need to add the following code to the <code>lists.js</code> file:

<pre><code>exports.blogpost = function (head, req) {

    start({code: 200, headers: {'Content-Type': 'text/html'}});

    // fetch row and set blogpost doc.
    var row = getRow();
    var doc = row.doc;

    // generate the markup for the blog post
    var content = templates.render('blogpost.html', req, doc);

    return {title: 'MyBlog', content: content};

};</code></pre>

## Presentation (and performance)

Because we pass the document to the render function instead of the rows,
we will keep using the blogpost.html as you can see above.
This will also show that you can mix these two types of collecting data
as long as you are aware of the difference.
In the case where performance is a huge difference, you can also use the slug as
the doc_id. But you need to have a lot of documents before you will notice that difference.
By then Couchbase Server 3.0 might be released and you can distribute the views over multiple nodes.

## Changing the blogposts view.

Now that the base for referencing the pages by slug is set up we can change the blogpost.html page.
For this we need to change the <code>blogposts_by_created</code> view to include the slug.
The slug needs to be added to the view, but for this we need to add a level to the data.

<pre><code class="javascript"> exports.blogposts_by_created = {
    map: function (doc) {
        if (doc.type === 'blogpost') {
            emit(doc.created, {"title": doc.title, "slug": doc.slug});
        }
    }
};</code></pre>

## Changing the blogposts presentation

Since the view above has been changed, we need to make a similar change in the blogposts.html file
and then replace the id with the new slug.
You can see that the <code>{value}</code> is moved a level and then the <code>{id}</code> is replaced with a <code>{slug}</code>

<pre><code>&lt;h1&gt;My Blog&lt;/h1&gt;

{?rows}
  &lt;ul&gt;
  {#rows}
    {#value}
      &lt;li&gt;&lt;a href="{baseURL}/blog/{slug}"&gt;{title}&lt;/a&gt;&lt;/li&gt;
    {/value}
  {/rows}
    &lt;/ul&gt;
  {:else}
  &lt;p&gt;No blog posts&lt;/p&gt;
{/rows}</code></pre>

## rewrite

Now we only need to add a rewrite to end up at the list instead of the view.
For this change the <code>lib/rewrites.js</code> file:

<pre><code class="javascript">module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_list/homepage/blogposts_by_created'},
    {from: '/add', to: '_update/add_blogpost', method: 'POST'},
    {from: '/add', to: '_show/add_blogpost'},
    {from: '/:id', to: '_show/blogpost/:id'},
    {from: '/blog/:slug', to: '_list/blogpost/blogposts_by_slug', query: { key: [':slug'], include_docs: 'true' } },
    {from: '*', to: '_show/not_found'}
];</code></pre>

This might need some explanation.
We just add the line for the list, use the new view for data and then add a query.
This query will select on the key, but also add the doc to the result using
<code>include_docs: 'true'</code>.
This addition will make sure that you don't need to put all the data you need in the view.
Since that will just double the filesize of your application.
In case you need optimal performance, then you might need to change the view to include the data that you need directly.

In the key selection you can also see the usage of the braces, that's needed to make sure that couchdb get's a proper json structure.
So don't forget to add that. You will also see this same usage in the view to reflect this call.

## Push and test.

Now push the app to your local database:

<pre><code class="no-highlight">kanso push http://user@localhost:5984/dbname</code></pre>

And test the app.

You can also find these additions to the myblog app on [github](https://github.com/smhoekstra/myblog)