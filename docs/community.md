# Community


## Support and Discussion

If you want to get involved or ask questions, these are good places to start:

* __IRC:__ #kansojs on FreeNode
* __Mailing List:__ [http://groups.google.com/group/kanso][mailinglist]


## Reporting Issues

Feature requests and bug reports should be added to the GitHub issues list

* __GitHub Issues:__ [https://github.com/caolan/kanso/issues][issues]


## Contributors

Here is a list of contributors that have had patches accepted and released
in a version of Kanso. If you'd like to appear on this list, there are plenty
of [issues in GitHub labelled 'easy'][easyissues] for newcomers to the project!

<ul id="contributors">

</ul>

<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js"></script>
<script>
    function kanso_contributors(result) {
        var cs = result.contributors || [];
        for (var i = 0, len = cs.length; i < len; i++) {
            var c = cs[i];
            var html = '<li>' +
                '<a href="https://github.com/' + c.login + '">' +
                    '<img src="http://gravatar.com/avatar/' + c.gravatar_id + '?size=48" />' +
                '</a>' +
                '<a href="https://github.com/' + c.login + '">' +
                    '<span class="name">' + (c.name || c.login) + '</span>' +
                '</a>' +
                '<span class="location">' + (c.location || '') + '</span>' +
            '</li>';
            $('#contributors').append(html);
        }
    };
</script>

<script src="https://github.com/api/v2/json/repos/show/caolan/kanso/contributors?callback=kanso_contributors"></script>



[mailinglist]: http://groups.google.com/group/kanso "Kanso Mailing List"
[issues]: https://github.com/caolan/kanso/issues "GitHub Issues"
[easyissues]: https://github.com/caolan/kanso/issues?labels=easy&sort=created&direction=desc&state=open&page=1 "Easy Issues in GitHub"
