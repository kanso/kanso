$(function () {

    var sidenav = $('#sidenav');
    var topbar_height = $('#topbar').height();
    var sitename_height = $('#sitename img').height();
    var sidenav_top = 204;

    sidenav.css({position: 'absolute', top: sidenav_top});

    var last_h2_li;
    $('h2, h3').each(function () {
        var h = $(this);
        var h_top = h.offset().top;
        if (this.id) {
            var a = $('<a href="#' + this.id + '"></a>');
            a.text(h.text());
            /*a.click(function (ev) {
                //ev.preventDefault();
                $(document).scrollTop(h_top - topbar_height * 1.618);
            });*/
            var li = $('<li></li>');
            li.append(a);
            li.data('h_offset', h_top);
            if (this.tagName.toLowerCase() === 'h3') {
                if (last_h2_li) {
                    var ul = $('ul', last_h2_li);
                    if (!ul.length) {
                        last_h2_li.append('<ul></ul>');
                        ul = $('ul', last_h2_li);
                    }
                    ul.append(li);
                }
            }
            else {
                last_h2_li = li;
                sidenav.append(li);
            }
        }
    });
    // highlight the first one
    $('#sidenav li:first').addClass('active');

    $('#topbar_overlay').css({opacity: 1});

    $(document).scroll(function () {
        var y = $(document).scrollTop();

        // fade topbar
        var ratio = (y - topbar_height) / sitename_height;
        ratio = Math.max(Math.min(ratio, 1), 0);
        $('#topbar_overlay').css({opacity: 1 - ratio * 0.25})

        // position sidenav
        if (y + topbar_height > sidenav_top) {
            sidenav.css({position: 'fixed', top: topbar_height});
        }
        else {
            sidenav.css({position: 'absolute', top: sidenav_top});
        }

        // highlight sidenav items
        var highest = $('#sidenav li')[0];
        $('#sidenav li').each(function () {
            if (y + topbar_height * 1.618 + 14 >= $(this).data('h_offset')) {
                highest = this;
            }
        });
        if (y + window.innerHeight >= $(document).height()) {
            highest = $('#sidenav li').last();
        }
        $('#sidenav li').not(highest).removeClass('active');
        $(highest).addClass('active')
        if ($(highest).parent()[0].id !== 'sidenav') {
            $(highest).parent().parent().addClass('active');
        }
    });

});
