/*
 * uPopup:
 *  A space-efficent pop-up dialog implementation for jQuery.
 *
 * Copyright (c) 2011, David Brown <browndav@spoonguard.org>
 * Copyright (c) 2011, Medic Mobile <david@medicmobile.org>
 * All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL MEDIC MOBILE OR DAVID BROWN BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * Special thanks to Medic Mobile, Inc. for making this project possible. Medic
 * Mobile is a US-based non-profit, that works in developing countries to improve
 * health care outcomes by leveraging SMS and web technologies.  If this project
 * has made your life easier in one way or another, and you'd like to give back
 * in some way, please consider donating directly at medicmobile.org. Your
 * donation is likely to be tax deductible if you reside within the United
 * States. Your donation will directly assist our construction of open-source
 * mobile health software.
 */

(function ($) {

    /**
     * uPopup - Markup and CSS Overview
     *
     *  The uPopup plugin uses CSS for all layout and appearance,
     *  including rounded corners, arrow/pointer placement, and
     *  drop shadows. Markup must follow a fixed structure; by
     *  default, the necessary markup is generated at runtime and
     *  used to wrap the element you provide. The markup format is
     *  (pipe characters denote mutually-exclusive alternatives):
     *
     *    <div class="upopup">
     *      <div class="direction {n|s|e|w|nw|ne|se|sw|wnw|wsw|ene|ese}">
     *        <div class="arrow first-arrow" />
     *        <div class="border">
     *          <div class="inner">
     *              { html | element | function }
     *          </div>
     *        </div>
     *        <div class="arrow last-arrow" />
     *        <div class="clear" />
     *      </div>
     *    </div>
     *
     *  The popup dialog uses a triangular <div> (made using a thick
     *  border, with three transparent sides) to point at the target
     *  element that you provide. Only one arrow may be visible at a
     *  time; the visible arrow can be controlled by using one of the
     *  css classes from the diagram below (pipes again denote "or"):
     *  
     *                    (n | nw)    (ne)
     *                       ^         ^
     *               (wnw) < +---------+ > (ene)
     *                       |         |
     *                       |         |
     *               (wsw) < +---------+ > (ese)
     *                       v         v
     *                    (s | sw)    (se)
     *
     *  To modify the appearance of any uPopup-managed element, use a
     *  custom stylesheet to override properties found in the default
     *  uPopup CSS file.
     */

    /**
     * uPopup - External API Overview
     *
     *  $.uPopup(_method, ...):
     *      This function is the primary entry point for all uPopup
     *      methods. To call a uPopup method, invoke this function on
     *      any jQuery object. Supply the method name in the first
     *      argument, followed by the arguments to the method. This
     *      function will dispatch your call to the appropriate API
     *      function.
     *
     *  create(this, _target_elts, _options):
     *      Create one or more popup windows out of the selected elements.
     *      The `this` object should be a jQuery selection, containing the
     *      element(s) that you'd like to have displayed inside of popup
     *      window. If the selection contains multiple elements, multiple
     *      popups will be created -- one for each. If you need to add
     *      multiple elements to a single popup dialog, wrap the elements
     *      in a single <div> (e.g. using jQuery's {wrap} function) before
     *      calling uPopup's {create} method.
     *
     *      this:
     *          A jQuery selection. These are referred to as 'source
     *          elements'; each element in the list will be wrapped inside
     *          of a separate popup dialog and displayed.
     *
     *      _target_elts:
     *          This argument is either (i) an array of elements,
     *          (ii) an array of javascript functions, or (iii) a jQuery
     *          selection. For each source element s[i] in {this}, the
     *          positioning algorithm will place s[i]'s popup relative
     *          to the target element t[i] in {_target_elts}. If t[i] is
     *          not defined, the positioning algorithm will use the closest
     *          previous element t[j] (max(j) | j < i) to determine an
     *          optimal position. If t[i] is a function, it will be invoked
     *          before positioning occurs, and must return an element.
     *
     *      _options:
     *          A javascript object, containing options that influence the
     *          behaviour of uPopup. A summary of the available options
     *          appears below:
     *
     *              fx:
     *                  A boolean value. True (default) if uPopup should be
     *                  permitted to use jQuery effects when showing/hiding
     *                  a popup dialog; false otherwise. Note that jQuery
     *                  itself has a similar global option.
     *
     *              eventData:
     *                  A jQuery event object, obtained from a mouse click
     *                  or mouse move handler. Each source element in {this}
     *                  will be placed directly underneath the coordinates
     *                  specified by this object's pageX and pageY values.
     *
     *              centerX, centerY, center:
     *                  A boolean value. Centres each source element in
     *                  {this} on its respective target element from
     *                  {_target_elts} -- either on the x-axis, y-axis,
     *                  or on both axes, respectively.
     *
     *              vertical:
     *                  A boolean value. If true, place each popup dialog's
     *                  pointer (i.e. triangular arrow) on the top or bottom
     *                  of the dialog, rather than on the left or right
     *                  side. This is useful if a popup dialog appears close
     *                  to the top or bottom edge of a window, and will be
     *                  used automatically bu the positioning code if it
     *                  isn't explicitly disabled here.
     *
     *              reposition:
     *                  A boolean value. True (the default) if uPopup should
     *                  attempt to reposition the popup dialog(s) when the
     *                  browser window is resized; false otherwise.
     *
     *              onShow:
     *                  A callback function. This function will be triggered
     *                  by uPopup after a popup window has appeared. When
     *                  this function is called, the popup window is
     *                  guaranteed to be visible, and all effects will have
     *                  completed.
     *
     *              onHide:
     *                  A callback function. This function will be triggered
     *                  by uPopup after a popup window has disappeared. When
     *                  this function is called, the popup window is
     *                  guaranteed to be invisible, and all effects will have
     *                  completed.
     *
     *              useViewport:
     *                  When set to true, the uPopup auto-positioning code
     *                  only considers visible space -- that is, space
     *                  appearing inside of the window element -- to be
     *                  available for placement. This constrains the dialog's
     *                  placement to visible locations only, and is the
     *                  default. Set this to false if you're okay with the
     *                  popup dialog occasionally being placed outside of
     *                  the viewport (but still within the document).
     *      
     *  elements():
     *      Returns the set of wrapper elements being maintained by the
     *      uPopup library. This function returns an array whose size is
     *      equal to the number of elements supplied to {create} in the
     *      {this} parameter. Each element in the return value "wraps"
     *      (i.e. contains) exactly one source element supplied to {create}.
     *
     *  show():
     *      Show a set of popup dialogs created using the {create} method.
     *      The value of {this} should contain only elements that have
     *      already been supplied to the {create} method. To fire an action
     *      when the popup dialogs are fully visible, use the {onShow}
     *      callback function.
     *
     *  hide():
     *      Hide a set of popup dialogs shown using the {show} method.
     *      The value of {this} should contain only elements that have
     *      already been supplied to the {create} method. To fire an action
     *      when the popup dialogs are fully visible, use the {onHide}
     *      callback function.
     *
     *  destroy():
     *      Irreversibly destroy the popup dialog "wrapper", along with
     *      the source elements you supplied in the {this} argument when
     *      calling {create}. Elements supplied in other arguments,
     *      including {_target_elts} and {_options}, are not affected.
     */

    $.uPopup = {};
    $.uPopup.impl = {

        /**
         * Initializes one or more new popup dialogs, and inserts each
         * in to the DOM as an immediate successor of a selected element.
         */
        create: function (_target_elts, _options) {

            var priv = $.uPopup.impl.priv;
            var options = (_options || {});
            var target_elts = priv.listify(_target_elts);

            $(this).each(function (i, popup_elt) {

                /* Target element:
                    Use the final element repeatedly if there
                    are not enough target elements provided. */

                var target_elt = (target_elts[i] || target_elts.last);

                /* Target element factory support:
                    Provide a function instead of a target element,
                    and it will be called to create targets at runtime. */

                if ($.isFunction(target_elt)) {
                    target_elt = target_elt.call(target_elt, popup_elt);
                }

                popup_elt = $(popup_elt);
                target_elt = $(target_elt);

                /* Wrap `popup_elt` inside of `wrapper_elt` */
                var wrapper_elt = priv.wrap(popup_elt);

                /* Save instance state data */
                popup_elt.data('upopup', {
                    elt: wrapper_elt,
                    options: options
                });

                /* Insert popup */
                priv.insert(
                    wrapper_elt, popup_elt, target_elt, options
                );

                /* Re-position popup to fit */
                priv.autoposition(
                    wrapper_elt, popup_elt, target_elt, options
                );

                /* Register event handlers */
                if (options.reposition !== false) {
                    $(window).resize(function (ev) {
                        $.uPopup.impl.priv.autoposition(
                            wrapper_elt, popup_elt, target_elt, options
                        );
                    });
                }

            });

            return this;
        },

        /**
         * Show the popup currently wrapping the selected element.
         * You can disable animations by setting _options.fx = false
         * in the `create` method, or by disabling jQuery's effects.
         */
        show: function () {
            var priv = $.uPopup.impl.priv;

            $(this).each(function (i, popup_elt) {
                var state = priv.instance_data_for(popup_elt);
                $.uPopup.impl.priv.toggle.call(
                    popup_elt, true, (state.options || {}).onShow
                )
            });
        },

        /**
         * Hide the popup currently wrapping the selected element(s).
         * You can disable animations by setting _options.fx = false
         * in the `create` method, or by disabling jQuery's effects.
         */
        hide: function (_callback) {
            var priv = $.uPopup.impl.priv;

            $(this).each(function (i, popup_elt) {
                var state = priv.instance_data_for(popup_elt);
                $.uPopup.impl.priv.toggle.call(
                    popup_elt, false, (state.options || {}).onHide
                )
            });
        },

        /**
         * Destroys the popup that is currently wrapping the
         * selected element(s), hiding the popup first if necessary.
         */
        destroy: function () {
            $.uPopup.impl.priv.toggle.call(
                this, false, function (_wrapper_elt) {
                    _wrapper_elt.remove();
                    delete _wrapper_elt;
                }
            );
        },

        /**
         * Given a list of originally-provided elements, this method
         * returns a list of the 'wrapper' elements currently in use.
         */
        elements: function () {

            var priv = $.uPopup.impl.priv;

            return $(
                $(this).map(function (i, popup_elt) {
                    /* Convert element to instance data */
                    var wrapper_elt = priv.instance_data_for(popup_elt).elt;
                    return (wrapper_elt ? wrapper_elt[0] : undefined);
                }).filter(function (wrapper_elt) {
                    /* Filter out undefined or empty values */
                    return !wrapper_elt;
                })
            );
        },

        /**
         * A namespace that contains private functions, each
         * used internally as part of uPopup's implementation.
         * Please don't call these from outside of $.uPopup.impl.
         */
        priv: {
            /**
             * Local variables:
             *  We provide a monotonically-increasing z-index for the
             *  popups we create, so as to ensure that newer popups
             *  always appear above older popups. This method imposes an
             *  artificial limit on the number of popups per page load,
             *  but it's far higher than any real-world use case.
             */
            _serial_number: 0,
            _zindex_base: 16384,

            /**
             * Make `_v` an array if it isn't already an array.
             */
            listify: function (_v) {
                return ($.isArray(_v) ? _v : [ _v ]);
            },

            /**
             * Returns the uPopup-private storage attached to `_elt`.
             */
            instance_data_for: function (_elt) {
                return ($(_elt).data('upopup') || {});
            },

            /**
             * Returns the array offset (i.e. index) that contains the
             * largest value in the array.
             */
            index_of_max: function (a) {
                var rv, max;
                for (var i = 0, len = a.length; i < len; ++i) {
                    if (!max || a[i] > max) {
                        max = a[i]; rv = i;
                    }
                }
                return rv;
            },

            /**
             * Returns a new DOM element, consisting of _popup_elt wrapped
             * inside of uPopup-specific elements. Values in _options
             * are used to control the appearance and layout of the wrapper.
             */
            wrap: function (_popup_elt, _options) {

                var options = (_options || {});

                var wrap_elt = $(
                    '<div class="upopup">' +
                        '<div class="direction">' +
                            '<div class="arrow first-arrow" />' +
                            '<div class="border">' +
                                '<div class="inner" />' +
                            '</div>' +
                            '<div class="arrow last-arrow" />' +
                            '<div class="clear" />' +
                        '</div>' +
                    '</div>'
                );

                $('.inner', wrap_elt).append(_popup_elt);
                return wrap_elt;
            },

            /**
             * Places a wrapped uPopup element inside of the DOM.
             * Values inside of the _options object are used to
             * control position and placement.
             */
            insert: function (_wrapper_elt,
                              _popup_elt, _target_elt, _options) {

                var options = (_options || {});
                var priv = $.uPopup.impl.priv;

                _wrapper_elt.css(
                    'z-index',
                    (priv._zindex_base + priv._serial_number++)
                );

                _wrapper_elt.css('display', 'none');
                _wrapper_elt.prependTo('body');

                $.uPopup.impl.show.call(_popup_elt)
            },

            /**
             * Shows or hides a currently-visible popup instance. To remove
             * an instance altogether, and discard the element, see the
             * destroy function. To create a new instance, use `create`.
             * This is the backend for impl.show and impl.hide.
             */
            toggle: function (_is_show, _callback) {

                var priv = $.uPopup.impl.priv;

                /* Multiple elements are allowed */
                $(this).each(function (i, popup_elt) {

                    /* Retrieve instance state data */
                    var state = priv.instance_data_for(popup_elt);
                    var options = (state.options || {});
                    var wrapper_elt = state.elt;

                    /* Build callback */
                    var callback = function () {
                        if (_callback) {
                            _callback.call(popup_elt, wrapper_elt);
                        }
                    };

                    /* Invoke action */
                    if (options.fx !== false) {
                        if (_is_show) {
                            wrapper_elt.fadeIn(null, callback);
                        } else {
                            wrapper_elt.fadeOut(null, callback);
                        }
                    } else {
                        if (_is_show) {
                            wrapper_elt.show();
                        } else {
                            wrapper_elt.hide();
                        }
                        callback.call(this);
                    }
                });

                return this;
            },

            /**
             * The popup dialog automatic repositioning algorithm. Places
             * `wrapper_elt` on the side of `target_elt` that has the most
             * available screen space, in each of two dimensions.
             */
            autoposition: function (_wrapper_elt,
                                    _popup_elt, _target_elt, _options) {
                var avail = {};
                var priv = $.uPopup.impl.priv;
                var options = (_options || {});

                var ev = options.eventData;
                var container_elt = $(document);

                /* Precompute sizes, offsets:
                    These figures are used in the placement algorithm. */
                    
                var target_offset = _target_elt.offset();

                var container_size = {
                    x: container_elt.width(),
                    y: container_elt.height()
                };
                var target_size = {
                    x: _target_elt.outerWidth(true),
                    y: _target_elt.outerHeight(true)
                };

                /* Available space on each side of target:
                    { x: [ left, right ], y: [ top, bottom ] } */
                
                if (ev) {

                    /* Event object provided:
                        This tells us where the pointer currently is.
                        We can use this instead of the target's corners. */

                    var pt = priv.event_to_point(
                        ev, priv.instance_data_for(_popup_elt),
                            target_offset, target_size
                    );

                    avail = {
                        x: [ pt.x, container_size.x - pt.x ],
                        y: [ pt.y, container_size.y - pt.y ]
                    };

                } else {

                    /* No event object:
                        Compute space relative to `target_elt`'s corners. */

                    avail = {
                        x: [
                            target_offset.left,
                            container_size.x -
                                target_offset.left - target_size.x
                        ],
                        y: [
                            target_offset.top,
                            container_size.y -
                                target_offset.top - target_size.y
                        ]
                    };
                }

                /* Placement relative to viewport:
                    If the viewport option has been set, then
                    only count space that's immediately visible. */

                if (options.useViewport !== false) {

                    var window_elt = $(window);

                    var window_offset = {
                        y: window_elt.scrollTop(),
                        x: window_elt.scrollLeft()
                    };

                    avail.x[0] -= window_offset.x;
                    avail.x[1] -= (
                        container_size.x -
                            (window_offset.x + window_elt.width())
                    );
                    avail.y[0] -= window_offset.y;
                    avail.y[1] -= (
                        container_size.y -
                            (window_offset.y + window_elt.height())
                    );

                }
                
                /* Indices:
                    Each value is an index for `avail` and `offsets`. */

                var indices = {
                    x: priv.index_of_max(avail.x),
                    y: priv.index_of_max(avail.y)
                };

                return priv.reposition(
                    _wrapper_elt, _popup_elt,
                        _target_elt, indices.x, indices.y, _options
                );
            },

            /**
             * This is the core repositioning function. This is used as the
             * back-end of auto_position, and may be called directly to
             * force a popup to appear facing a certain direction. The
             * {_target_elt} is the element that the popup should point
             * to; {_wrapper_elt} is the return value obtained from calling
             * {priv.wrap}; _x and _y are boolean values denoting left/right
             * and top/bottom (each zero/one or false/true, respectively).
             */
            reposition: function (_wrapper_elt, _popup_elt,
                                  _target_elt, _x, _y, _options) {
                var offsets;
                var priv = $.uPopup.impl.priv;
                var options = (_options || {});

                var ev = options.eventData;
                var inner_elt = _wrapper_elt.closestChild('.direction');
                var arrow_elt = inner_elt.closestChild('.arrow');

                /* Precompute sizes:
                    These figures are used in the placement algorithm. */
                        
                var target_offset = _target_elt.offset();

                var wrapper_size = {
                    x: _wrapper_elt.outerWidth(true),
                    y: _wrapper_elt.outerHeight(true)
                };
                var target_size = {
                    x: _target_elt.outerWidth(true),
                    y: _target_elt.outerHeight(true)
                };
                var padding_size = {
                    x: (wrapper_size.x - inner_elt.width()) / 2,
                    y: (wrapper_size.y - inner_elt.height()) / 2
                };
                var arrow_size = {
                    x: arrow_elt.outerWidth(),
                    y: arrow_elt.outerHeight()
                };

                /* Delta value:
                    Distance between popup's edge and arrow's edge. */

                var d = priv.calculate_arrow_delta(_wrapper_elt);

                /* Coefficients:
                    Arrow size, adjust width/x, adjust height/y */

                var c = (
                    options.vertical ? [ -1, 1, 0 ] : [ 1, 0, 1 ]
                );

                if (ev) {

                    /* Event object provided:
                        This tells us where the pointer currently is.
                        We can use this instead of the target's corners
                        to determine the list of possible placements. */

                    var pt = priv.event_to_point(
                        ev, priv.instance_data_for(_popup_elt),
                            target_offset, target_size
                    );

                    offsets = {
                        x: [
                            pt.x - wrapper_size.x - c[0] * arrow_size.x / 2
                                + c[1] * d.x,
                            pt.x + c[0] * arrow_size.x / 2 - c[1] * d.x
                        ],
                        y: [
                            pt.y - wrapper_size.y + c[0] * arrow_size.y / 2
                                + c[2] * d.y,
                            pt.y - c[0] * arrow_size.y / 2 - c[2] * d.y
                        ]
                    };

                } else {

                    /* No event object:
                        Possible offsets are the target's four corners. */

                    offsets = {
                        x: [
                            target_offset.left - wrapper_size.x + c[1] * d.x
                                + padding_size.x - c[0] * arrow_size.x / 2,
                            target_offset.left + target_size.x - c[1] * d.x
                                - padding_size.x + c[0] * arrow_size.x / 2
                        ],
                        y: [
                            target_offset.top - wrapper_size.y + c[2] * d.y
                                + padding_size.y + c[0] * arrow_size.y / 2,
                            target_offset.top + target_size.y - c[2] * d.y
                                - padding_size.y - c[0] * arrow_size.y / 2
                        ]
                    };
                }

                /* Use center of target, instead of its corner:
                    The center of `target_elt` is always toward zero (i.e.
                    pointed away from the maximal edge of the available
                    space). Due to this fact, the following steps never
                    yield less room for dialog placement -- always more. */

                if (!options.eventData) {
                    if (options.center || options.centerX) {
                        var dx = target_size.x / 2;
                        offsets.x[0] += dx;
                        offsets.x[1] -= dx;
                    }
                    if (options.center || options.centerY) {
                        var dy = target_size.y / 2;
                        offsets.y[0] += dy;
                        offsets.y[1] -= dy;
                    }
                }

                /* Position arrow:
                    We place the arrow on the corner of the popup that
                    is closest to the near corner of the target element. */

                var classes = (
                    options.vertical ?
                        [ [ 'se', 'ne' ], [ 's', 'n' ] ]
                        : [ [ 'ese', 'e' ], [ 'wsw', 'w' ] ]
                );

                inner_elt.removeClass('se ne s n ese e wsw w');
                inner_elt.addClass(classes[_x][_y]);

                /* Finally, reposition:
                    Write the actual style change to the DOM element. */

                _wrapper_elt.offset({
                    top: offsets.y[_y],
                    left: offsets.x[_x]
                });
            },

            /**
             * Use an invisible <div> to determine the number of additional
             * pixels needed to shift to the arrow element's exact point.
             * This is required due to the use of absolute positioning --
             * we don't have a solid way to determine the offset-from-edge
             * in pixels using position data alone.
             */
            calculate_arrow_delta: function (_wrapper_elt)
            {
                var adjust_div = $('<div />').addClass('adjust');
                _wrapper_elt.append(adjust_div)

                var delta = {
                    x: adjust_div.width(),
                    y: adjust_div.height()
                };

                adjust_div.remove();
                return delta;
            },

            /*
             * Given a jQuery event object (containing both pageX and
             * pageY coordinates), extract the coordinates and apply any
             * necessary transformations.
             */
            event_to_point: function (ev, state, offset, size) {

                var x = ev.pageX, y = ev.pageY;

                if (state.ratio) {

                    /* Do we have a offset-to-size ratio?
                        If so, adjust x and y before returning. */

                    x = offset.left + state.ratio.x * size.x;
                    y = offset.top + state.ratio.y * size.y;
                }

                /* Save offset-to-size ratio:
                    If the target element is resized, then we'll use 
                    this ratio to adjust the event coordinates later. */

                if (!state.ratio) {
                    state.ratio = {
                        x: (x - offset.left) / size.x,
                        y: (y - offset.top) / size.y
                    };
                }

                return { x: x, y: y };
            }

        }
    };

    $.fn.uPopup = function (/* const */_method /* , ... */) {

        /* Dispatch to appropriate method handler:
            Note that the `method` argument should always be a constant.
            Never allow user-provided input to be used for the argument. */

        return $.uPopup.impl[_method].apply(
            this, Array.prototype.slice.call(arguments, 1)
        );
    };

})(jQuery);


/* 
 * closestChild for jQuery
 * Copyright 2011, Tobias Lindig
 * 
 * Dual licensed under the MIT license and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.opensource.org/licenses/gpl-license.php
 */
(function ($) {
    if (!$.fn.closestChild) {
        $.fn.closestChild = function (selector) {
            /* Breadth-first search for the first matched node */
            if (selector && selector !== '') {
                var queue = [];
                queue.push(this);
                while (queue.length > 0) {
                    var node = queue.shift();
                    var children = node.children();
                    for (var i = 0; i < children.length; ++i) {
                        var child = $(children[i]);
                        if (child.is(selector)) {
                            return child;
                        }
                        queue.push(child);
                    }
                }
            }
            return $(); /* Nothing found */
        };
    }
}(jQuery));

