# Writing Guides

One of the best ways to give back to the Kanso project is to help others get
started. You don't have to be an expert, you just need to have learned something
that should be better documented.

To add a guide, you need to fork the Kanso repository on
[GitHub](http://github.com). You'll find contributing a lot easier if you have
an account there, so sign-up if you don't already have one.

Once you've signed-up you can visit the [Kanso](https://github.com/caolan/kanso)
page and click the fork button. You should be presented you your own copy of
the Kanso repository to work with. Get a copy of your new repository by doing the
following (replacing USERNAME with your GitHub login):

    git clone git@github.com:USERNAME/kanso.git
    cd kanso

You now have a copy of the Kanso code. You'll need to fetch some dependencies:

    git submodule init
    git submodule update

After that finishes downloading, you're ready to get started. The guides are
in the <code>docs/guides</code> directory and are written in
[Markdown](http://daringfireball.net/projects/markdown/syntax). Simply add a
new file with the <code>.md</code> extension to start a new guide. You can
freely mix Markdown and normal HTML as you wish. If you want to add screenshots,
put them in the <code>docs/guides/images</code> directory.

Once you've finished authoring, you'll want to add an entry in the
<code>guides/index.md</code> file with a short description of your guide.
You can preview the changes by running the following command in the main
Kanso project directory:

    make docs

This will create a <code>www</code> directory containing the HTML files for the
Kanso website. Open it up in your browser and see how your guide looks!

    google-chrome www/index.html

When you're happy with the work, commit your changes and push back to your
repository:

    git add docs/guides
    git commit -m "My new guide"
    git push origin master

Visit your copy of Kanso on GitHub and you should see the new commit. Click the
"pull request" button on the top right of the page to submit your work.

__Congratulations__, you've just helped your fellow developer, and learned how to
send updates to the Kanso project at the same time. If you want to send patches,
you can do it in the same way, committing your changes to your own branch,
then sending a pull request. Why not take a look at the
[issues page](https://github.com/caolan/kanso/issues) and take a swing at one?
