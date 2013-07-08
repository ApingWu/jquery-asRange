/*
 * range
 * https://github.com/amazingSurge/jquery-range
 *
 * Copyright (c) 2013 joeylin
 * Licensed under the MIT license.
 */

(function($) {

    // Pointer constuctor
    function Pointer($element, id, parent) {
        this.$element = $element;
        this.uid = id;
        this.parent = parent;
        this.options = $.extend(true, {}, this.parent.options);
        this.interval = this.parent.interval;
        this.value = null;

        this.direction = parent.direction;
        this.mouse = parent.mouse;
        this.maxDimesion = parent.maxDimesion;

        this.init();
    }

    Pointer.prototype = {
        constructor: Pointer,
        init: function() {
            this.$element.on('mousedown', $.proxy(this.mousedown, this));
        },

        mousedown: function(event) {
            var limit = {},
                offset = this.parent.$element.offset();

            if (this.parent.enabled === false) {
                return;
            }

            this.data = {};
            this.data.start = event[this.mouse];
            this.data[this.direction] = event[this.mouse] - offset[this.direction];

            this._set(this.data[this.direction]);

            $.each(this.parent.pointer, function(i, p) {
                p.$element.removeClass('pointer-active');
            });

            this.$element.addClass('pointer-active');

            this.mousemove = function(event) {
                var value = this.data[this.direction] + (event[this.mouse] || this.data.start) - this.data.start;

                if (this.parent.options.limit === true) {

                    limit = this.limit();

                    if (value < limit.left) {
                        value = limit.left;
                    }
                    if (value > limit.right) {
                        value = limit.right;
                    }

                }

                this._set(value);
                return false;
            };

            this.mouseup = function() {

                $(document).off({
                    mousemove: this.mousemove,
                    mouseup: this.mouseup
                });


                if (typeof this.parent.options.callback === 'function') {
                    this.parent.options.callback(this);
                }

                this.$element.trigger('end', this);

                return false;
            };

            $(document).on({
                mousemove: $.proxy(this.mousemove, this),
                mouseup: $.proxy(this.mouseup, this)
            });

            return false;
        },

        // @value number the position value
        _set: function(value) {
            var actualValue,
                posValue,
                position = {};

            if (value < 0) {
                value = 0;
            }

            if (value > this.maxDimesion) {
                value = this.maxDimesion;
            }

            if (this.options.step > 0) {
                actualValue = this.getActualValue(value);
                posValue = this.step(actualValue);
            } else {
                posValue = value;
            }

            // make sure to redraw only when value changed 
            if (posValue !== this.value) {
                position[this.direction] = posValue;
                this.$element.css(position);
                this.value = posValue;

                if (typeof this.parent.options.onChange === 'function') {
                    this.parent.options.onChange(this);
                }

                this.$element.trigger('change', this);
            }
        },

        // get postion value
        // @param {value} number the actual value
        getPosValue: function(value) {

            // here value = 0  change to false
            if (value !== undefined) {
                return value / this.parent.interval * this.maxDimesion;
            } else {
                return this.value;
            }
        },

        // get actual value
        // @param {value} number the position value
        getActualValue: function(value) {
            var actualValue = value / this.maxDimesion * this.parent.interval + this.parent.min;
            return actualValue;
        },

        // step control
        // @param {value} number the position value
        // return position value
        step: function(value) {
            var convert_value,
                step = this.options.step;

            if (step > 0) {
                convert_value = Math.round(value / step) * step;
            }

            return this.getPosValue(convert_value);
        },

        // limit pointer move range
        limit: function() {
            var left, right;

            if (this.uid === 1) {
                left = 0;
            } else {
                left = this.parent.pointer[this.uid - 2].getPosValue();
            }

            if (this.parent.pointer[this.uid]) {
                right = this.parent.pointer[this.uid].getPosValue();
            } else {
                right = this.maxDimesion;
            }

            return {
                left: left,
                right: right
            };
        },


        /*
            Public Method
         */   

        // @param {value} Number the actual value
        set: function(value) {
            value = this.getPosValue(value);
            this._set(value);
        },

        // reutrn actual value
        get: function() {
            var value = this.getActualValue(this.value);
            return this.options.format(Math.round(value * 100) / 100);
        },

        destroy: function() {
            this.$element.off('mousedown');
        }

    };

    // main constructor
    var Range = $.range = function(range, options) {
        var metas = {};

        this.range = range;
        this.$range = $(range);
        this.$element = null;

        if (this.$range.is('input')) {
            var inputValue = this.$range.attr('value');

            metas.min = parseFloat(this.$range.attr('min'));
            metas.max = parseFloat(this.$range.attr('max'));
            metas.step = parseFloat(this.$range.attr('step'));
            
            if (inputValue) {
                metas.value = [];
                metas.value.push(inputValue);
            }

            this.$range.css({
                display: 'none'
            });

            this.$element = $("<div></div>");
            this.$range.after(this.$element);
        } else {
            this.$element = this.$range;
        }

        this.$element.css({
            position: 'relative'
        });

        this.options = $.extend({}, Range.defaults, options, metas);
        this.namespace = this.options.namespace;
        this.components = $.extend(true, {}, this.components);

        // public properties
        this.value = this.options.value;
        this.min = this.options.min;
        this.max = this.options.max;
        this.interval = this.max - this.min;

        // flag
        this.initial = false;
        this.enabled = true;

        this.$element.addClass(this.namespace).addClass(this.options.skin);

        if (this.max < this.min || this.step <= this.interval) {
            throw new Error('error options about max min step');
        }

        this.init();
    };

    Range.prototype = {
        constructor: Range,
        components: {},

        init: function() {
            var self = this;

            this.pointer = [];
            this.width = this.$element.width();
            this.height = this.$element.height();

            if (this.options.vertical === 'v') {
                this.direction = 'top';
                this.mouse = 'pageY';
                this.maxDimesion = this.height;
            } else {
                this.direction = 'left';
                this.mouse = 'pageX';
                this.maxDimesion = this.width;
            }

            //this.$bar = $('<span class="range-bar"></span>').appendTo(this.$element);
            for (var i = 1; i <= this.options.pointer; i++) {
                var $pointer = $('<span class="' + this.namespace + '-pointer"></span>').appendTo(this.$element);
                var p = new Pointer($pointer, i, this);

                this.pointer.push(p);
            }

            // alias of every pointer
            this.p1 = this.pointer[0];
            this.p2 = this.pointer[1];

            // initial components
            this.components.view.init(this);

            if (this.options.tip !== false) {
                this.components.tip.init(this);
            }
            if (this.options.scale === false) {
                this.components.scale.init(this);
            }

            // initial pointer value
            this.setValue(this.value);
            this.$element.on('mousedown', function(event) {
                var offset = self.$element.offset(),
                    start = event[self.mouse] - offset[self.direction],
                    p = self.stickTo.call(self, start);

                p.mousedown.call(p, event);
                return false;
            });

            if (this.$range.is('input')) {
                this.p1.$element.on('change', function(event,instance) {
                    var value = instance.get();
                    self.$element.val(value);
                });
            }

            this.initial = true;
        },
        stickTo: function(start) {
            if (this.options.pointer === 1) {
                return this.p1;
            }

            if (this.options.pointer === 2) {
                var p1 = this.p1.getPosValue(),
                    p2 = this.p2.getPosValue(),
                    diff = Math.abs(p1 - p2);
                if (p1 <= p2) {
                    if (start > p1 + diff / 2) {
                        return this.p2;
                    } else {
                        return this.p1;
                    }
                } else {
                    if (start > p2 + diff / 2) {
                        return this.p1;
                    } else {
                        return this.p2;
                    }
                }
            }
        },

        /*
            Public Method
         */
        
        getValue: function() {
            var value = [];

            $.each(this.pointer, function(i, p) {
                value[i] = p.get();
            });

            return value;
        },
        setValue: function(value) {
            $.each(this.pointer, function(i, p) {
                p.set(value[i]);
            });

            this.value = value;
        },
        setInterval: function(start, end) {
            this.min = start;
            this.max = end;
            this.interval = end - start;
        },
        enable: function() {
            this.enabled = true;
            this.$element.addClass(this.namespace + 'enabled');
            return this;
        },
        disable: function() {
            this.enabled = false;
            this.$element.removeClass(this.namespace + 'enabled');
            return this;
        },
        destroy: function() {
            $.each(this.pointer, function(i, p) {
                p.destroy();
            });
        }
    };

    Range.defaults = {
        namespace: 'range',
        skin: null,

        max: 100,
        min: 0,
        value: [0, 20],
        step: 10,

        pointer: 2,
        limit: true,
        orientation: 'v', // 'v' or 'h'

        // components
        tip: true,
        scale: false,

        // custom value format
        // @param {value} Number  origin value
        // return a formatted value
        format: function(value) {
            // to do
            return value;
        },

        // on state change
        onChange: function(instance) {
            // console.log(instance.uid);
            // console.log(instance.get());
        },

        // on mouse up 
        callback: function() {}
    };

    Range.registerComponent = function(component, methods) {
        Range.prototype.components[component] = methods;
    };

    $.fn.range = function(options) {
        if (typeof options === 'string') {
            var method = options;
            var method_arguments = arguments.length > 1 ? Array.prototype.slice.call(arguments, 1) : undefined;

            return this.each(function() {
                var api = $.data(this, 'range');
                if (typeof api[method] === 'function') {
                    api[method].apply(api, method_arguments);
                }
            });
        } else {
            return this.each(function() {
                if (!$.data(this, 'range')) {
                    $.data(this, 'range', new Range(this, options));
                }
            });
        }
    };

    Range.registerComponent('tip', {
        defaults: {
            active: 'always' // 'always' 'onmove'
        },
        init: function(instance) {
            var self = this,
                opts = $.extend({}, this.defaults, instance.options.tip);

            this.opts = opts;

            this.tip = [];
            $.each(instance.pointer, function(i, p) {
                var $tip = $('<span class="range-tip"></span>').appendTo(instance.pointer[i].$element);

                if (self.opts.active === 'onmove') {
                    $tip.css({
                        display: 'none'
                    });
                    p.$element.on('change', function(e, pointer) {
                        $tip.text(pointer.get());

                        if (instance.initial === true) {
                            self.show();
                        }
                    });

                    p.$element.on('end', function(e, pointer) {
                        self.hide();
                    });

                } else {
                    p.$element.on('change', function(e, pointer) {
                        $tip.text(pointer.get());
                    });
                }

                self.tip.push($tip);
            });
        },
        show: function() {
            $.each(this.tip, function(i, $tip) {
                $tip.fadeIn('slow');
            });
        },
        hide: function() {
            $.each(this.tip, function(i, $tip) {
                $tip.fadeOut('slow');
            });
        }
    });
    Range.registerComponent('view', {
        defaults: {},
        init: function(instance) {
            var self = this;
            this.$arrow = $('<span class="range-view"></span>').appendTo(instance.$element);

            if (instance.pointer.length === 1) {
                instance.pointer[0].$element.on('change', function(e, pointer) {
                    var left = 0,
                        right = pointer.getPosValue();

                    self.$arrow.css({
                        left: 0,
                        width: right - left
                    });
                });
            }

            if (instance.pointer.length === 2) {
                instance.pointer[0].$element.on('change', function(e, pointer) {
                    var left = pointer.getPosValue(),
                        right = instance.pointer[1].getPosValue();

                    self.$arrow.css({
                        left: Math.min(left, right),
                        width: Math.abs(right - left)
                    });
                });
                instance.pointer[1].$element.on('change', function(e, pointer) {
                    var right = pointer.getPosValue(),
                        left = instance.pointer[0].getPosValue();

                    self.$arrow.css({
                        left: Math.min(left, right),
                        width: Math.abs(right - left)
                    });
                });
            }
        }
    });
    Range.registerComponent('scale', {
        defaults: {
            scale: [0, 50, 100]
        },
        init: function(instance) {
            var self = this,
                opts = $.extend({}, this.defaults, instance.options.tip),
                len = opts.scale.length;

            this.$scale = $('<ul class="range-scale"></ul>');
            $.each(opts.scale, function(i, v) {
                var $li = $('<li>' + v + '</li>');

                $li.css({
                    left: i / (len - 1) * 100 + '%'
                });

                $li.appendTo(self.$scale);

            });
            this.$scale.appendTo(instance.$element);
        }
    });

}(jQuery));

