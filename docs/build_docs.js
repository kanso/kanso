var scrawl = require('scrawl'),
    Showdown = require('./showdown'),
    async = require('async'),
    utils = require('../lib/utils'),
    templates = require('../packages/kanso-templates/build/templates'), // XXX This looks like a bug - jhs Fri Dec  9 07:21:45 GMT 2011
    dust = require('dust/lib/dust'),
    path = require('path'),
    fs = require('fs');


var output_dir = __dirname + '/../www';
var template_dir = __dirname + '/templates';


function get_named_public_apis(comments) {
    return comments.filter(function (c) {
        return c.api === 'public' && c.name;
    });
}

function get_module_comment(comments) {
    return comments.filter(function (c) {
        return c.module;
    })[0];
};

function render_module(module) {
    var html = '<h2 id="' + module.name + '">' + module.name + '</h2>';
    var c = get_module_comment(module.comments);
    if (c) {
        html += c.description_html;
    }
    var items = get_named_public_apis(module.comments);
    return html + items.map(function (i) {
        return render_item(module, i);
    }).join('');
}

function render_item(module, item) {
    var html = '<h3 id="' + item_id(module, item) + '">' +
               item.name + '</h3>';
    html += item.description_html;
    if (item.params) {
        html += '<h4>Parameters</h4>';
        html += '<table class="params">';
        html += item.params.map(function (p) {
            return '<tr>' +
                '<td class="name">' + (p.name || '') + '</td>' +
                '<td class="type">' + (p.type || '') + '</td>' +
                '<td class="description">' + (p.description || '') + '</td>' +
            '</tr>';
        }).join('');
        html += '</table>';
    }
    if (item.returns) {
        html += '<div class="returns">' +
            '<strong>Returns: </strong>' +
            '<span class="type">' + item.returns + '</span>' +
        '</div>';
    }
    return html;
}

function item_id(module, item) {
    return module.name + '.' + item.name.replace(/\(.*$/, '');
}

function create_page(infile, outfile, nav, title, rootURL, callback) {
    if (!callback) {
        callback = rootURL;
        rootURL = '.';
    }
    fs.readFile(infile, function (err, content) {
        if (err) {
            return callback(err);
        }
        var converter = new Showdown.converter();
        var html = converter.makeHtml(content.toString());
        if (!title && title !== '') {
            title = content.toString().replace(/^\s*# /, '').replace(/\n.*/g, '');
        }
        var navobj = {};
        navobj[nav] = true;
        var context = {
            content: html,
            rootURL: rootURL,
            nav: navobj,
            title: title
        };
        dust.render('base.html', context, function (err, result) {
            if (err) {
                return callback(err);
            }
            fs.writeFile(outfile, result, callback);
        });
    });
}

function create_guides(dir, outdir, callback) {
    utils.find(dir, /\.md$/, function (err, files) {
        async.forEach(files, function (f, cb) {
            var name = path.basename(f, '.md');
            create_page(
                f,
                outdir + '/' + name + '.html',
                'guides',
                null,
                '..',
                callback
            );
        });
    });
}

function load_templates(path, callback) {
    templates.find(path, function (err, paths) {
        if (err) {
            return callback(err);
        }
        async.forEach(paths, function (p, cb) {
            fs.readFile(p, function (err, content) {
                if (err) {
                    return callback(err);
                }
                var rel = utils.relpath(p, path);
                dust.compileFn(content.toString(), rel);
                cb();
            });
        }, callback);
    });
}


async.parallel({
    load_templates: async.apply(load_templates, template_dir),
    ensureDir:    async.apply(utils.ensureDir, output_dir)
},
function (err, results) {
    if (err) {
        console.error(err);
        return console.error(err.stack);
    }
    var modules = results.parseModules;
    async.parallel([
        async.apply(
            create_page,
            __dirname + '/index.md',
            output_dir + '/index.html',
            'about',
            ''
        ),
        async.apply(
            create_page,
            __dirname + '/download.md',
            output_dir + '/download.html',
            'download',
            ''
        ),
        async.apply(
            create_page,
            __dirname + '/community.md',
            output_dir + '/community.html',
            'community',
            'Community'
        ),
        async.apply(
            create_page,
            __dirname + '/docs.md',
            output_dir + '/docs.html',
            'api',
            'API'
        ),
        async.apply(
            create_page,
            __dirname + '/tutorial.md',
            output_dir + '/tutorial.html',
            'guides',
            'Guides'
        ),
        async.apply(
            create_guides,
            __dirname + '/guides',
            output_dir + '/guides'
        )
    ],
    function (err) {
        if (err) {
            console.error(err);
            return console.error(err.stack);
        }
        console.log('OK');
    });
});
