/**
 * @file   图片预览查看器
 * @author wxp201013@163.com
 */

define(function(require, exports, module) {
  require('./index.less');

  var Hammer = require('dep/hammer');

  var Emitter = require('widget/class/emitter');

  var ImageView = {
    options: {

      // get image source from elem
      elem: null,

      // get image mannualy without elem
      imgSource: [],

      // static construct tpl
      staticTpl: false,

      cur: 0,

      dataAttribute: 'pics',

      proportion: 0.4,

      speed: 200,

      animate: true,

      hasToolBar: true,

      hasMetaBar: false,

      preload: 1,

      zoomScale: 1,

      isFullScreen: true,

      allowHistory: false,

      hasBack: true
    },

    init: function(options) {
      this.loadedArr = [];

      options = extend(this.options, options);

      this.initViewport();

      // init tpl
      if (options.staticTpl) {
        this.initStaticTpl();
      } else {
        this.initTpl();
      }

      // refresh pos
      this.refreshImagePos();

      // bind event
      this.bindEvent();

      return this;
    },

    initStaticTpl: function() {
      var options = this.options;

      var staticTpl = options.staticTpl;

      this.mask = document.querySelector(staticTpl.mask);

      this.main = document.querySelector(staticTpl.main);

      // image list's wrapper
      var wrapper = this.wrapper = document.createElement('ul');
      wrapper.setAttribute('class', 'imageview-wrap');
      this.main.appendChild(wrapper);

      // add top bar
      if (options.hasToolBar) {
        this.renderToolBar();
      }

      // construct image list's html
      this.render();

      // add bottom bar
      if (options.hasMetaBar) {
        this.renderMetaBar();
      }
    },

    /**
     * construct image preview's html
     */
    initTpl: function() {
      var options = this.options;

      var maskDiv = this.mask = document.createElement('div');
      maskDiv.setAttribute('class', 'ui-mask');

      var maskWrapper = document.createElement('div');
      maskWrapper.setAttribute('class', 'wrapper');
      maskDiv.appendChild(maskWrapper);

      var main = this.main = document.createElement('div');
      main.setAttribute('class', 'ui-imageview');
      maskWrapper.appendChild(main);

      // add top bar
      if (options.hasToolBar) {
        this.renderToolBar();
      }

      // image list's wrapper
      var wrapper = this.wrapper = document.createElement('ul');
      wrapper.setAttribute('class', 'imageview-wrap');
      main.appendChild(wrapper);

      // add bottom bar
      if (options.hasMetaBar) {
        this.renderMetaBar();
      }

      // construct image list's html
      this.render();

      document.body.appendChild(maskDiv);
    },

    initViewport: function() {
      this.viewW = window.innerWidth;
      this.viewH = window.innerHeight;
    },

    refreshImagePos: function() {
      var wrapper = this.wrapper;

      var options = this.options;

      var viewW = this.viewW;
      var viewH = this.viewH;

      var len = this.length;

      var me = this;

      this.albums = wrapper.querySelectorAll('[data-role="imageview-item"]');

      [].forEach.call(this.albums, function(node) {
        node.style.width = viewW + 'px';
        node.style.height = viewH + 'px';

        if (node.querySelector('img')) {
          imageResizeToCenter(node.querySelector('img'), {
            width: viewW,
            height: viewH
          });
        }
      });

      wrapper.style.width = viewW * len + 'px';
    },

    bindEvent: function() {
      var events = 'release drag swipeleft swiperight tap';

      var main = this.main;

      var wrapper = this.wrapper;

      var options = this.options;

      var me = this;

      this.hammer = new Hammer(wrapper, {
        dragLockToAxis: true,
      }).on(events, this.eventTouchHandler.bind(this));

      wrapper.addEventListener('touchstart', function(e) {
        e.preventDefault();
      });

      window.addEventListener('resize', function(e) {
        me.initViewport();

        me.refreshImagePos();
      }, false);

      this.on('pagechange', function(index) {
        if (options.hasToolBar) {
          main.querySelector('[data-role="curPic"]').textContent = index + 1;
        }
      });

      if (options.hasBack) {
        main.querySelector('[data-role="back"]').addEventListener('click', function(e) {
          e.preventDefault();

          me.hide();
        }, false);
      }

      if (options.allowHistory) {
        this.realHide = this.hide;

        this.hide = function() {
          if (this.showing) {
            history.back();
          }
        };
      }
    },

    loadImage: function(pos) {
      var len = this.length;

      var loadedArr = this.loadedArr;

      if (pos < 0 || pos >= len || loadedArr.indexOf(pos) > -1) {
        return;
      }

      loadedArr.push(pos);

      var node = this.albums[pos];

      var me = this;

      if (node && !parseInt(node.getAttribute('data-load'), 10)) {
        var img = document.createElement('img');

        img.style.display = 'none';

        img.onload = function() {
          this.onload = null;

          node.setAttribute('data-load', 1);

          imageResizeToCenter(img, {
            width: me.viewW,
            height: me.viewH
          });

          node.appendChild(img);

          img.style.display = '';
        };

        img.src = this.options.imgSource[pos];
      }
    },

    eventTouchHandler: function(ev) {
      var viewW = this.viewW;

      var options = this.options;
      var cur = options.cur;

      var length = this.length;

      var gesture = ev.gesture;

      gesture.preventDefault();

      switch (ev.type) {
        case 'drag':
          var direction = gesture.direction;

          if (direction === 'left' || direction === 'right') {
            // stick to the finger
            var dragOffset = ((100 / viewW) * gesture.deltaX) / length;

            // slow down at the first and last pane
            if (
              (cur === 0 && direction === 'right') ||
              (cur === length - 1 && direction === 'left')
            ) {
              dragOffset *= 0.4;
            }

            // switch without animate
            this.move(-cur / length * 100 + dragOffset);
          }
          break;

        case 'swipeleft':

          this.next();

          break;

        case 'tap':

          options.isFullScreen ? this.fullScreen() : this.hide();

          break;

        case 'swiperight':

          this.prev();

          break;

        case 'release':
          // 达到切换阀值，则根据滑动方向切换
          if (Math.abs(gesture.deltaX) > viewW * options.proportion) {
            gesture.direction === 'right' ? this.prev() : this.next();
          } else { // 未达到, 则回弹
            this.go(cur);
          }

          break;
      }
    },

    fullScreen: function() {
      this.main.classList.toggle('ui-imageview-full');
    },

    renderToolBar: function() {
      var hasBack = this.options.hasBack;

      hasBack = hasBack ? '<span data-role="back"></span>' : '';

      var div = document.createElement('div');

      div.innerHTML = '' +
        '<div class="imageview-toolbar">' +
        hasBack +
        '<p>' +
        '<span data-role="curPic"></span>/' +
        '<span data-role="totalPic"></span>' +
        '</p>' + '</div>';

      this.main.appendChild(div.firstChild);
    },

    renderMetaBar: function() {
      var div = document.createElement('div');

      div.innerHTML = '<div class="imageview-metabar" data-role="imageview-metabar"></div>';

      this.main.appendChild(div.firstChild);
    },

    /**
     * repaint when imagesource change
     *
     * @param {HTMLElement} container elem with dataAttribute(pics)
     */
    update: function(container) {
      var elem = this.options.elem;

      if (container !== elem) {
        this.loadedArr = [];

        this.options.elem = container;

        this.render();

        this.refreshImagePos();
      }
    },

    /**
     * construct img's html
     */
    render: function() {
      var wrapper = this.wrapper;

      var options = this.options;

      var picAttribute = 'data-' + (options.dataAttribute || 'pics');

      if (options.elem) {
        options.imgSource = options.elem.getAttribute(picAttribute).split(',');
      }

      this.length = options.imgSource.length || 0;

      var fragment = document.createDocumentFragment();

      wrapper.innerHTML = '';

      options.imgSource.forEach(function(image, index) {
        var li = document.createElement('li');

        li.setAttribute('class', 'imageview-item');
        li.setAttribute('data-role', 'imageview-item');
        li.setAttribute('data-load', 0);

        fragment.appendChild(li);
      });

      wrapper.appendChild(fragment);

      if (options.hasToolBar) {
        this.main.querySelector('[data-role="totalPic"]').textContent = this.length;
      }

      if (options.hasMetaBar) {
        var metabar = this.main.querySelector('[data-role="imageview-metabar"]');

        if (typeof options.hasMetaBar === 'string') {
          // dom selector
          if (options.elem) {
            metabar.textContent = options.elem.querySelector(options.hasMetaBar).textContent;
          } else { // text
            metabar.textContent = options.hasMetaBar;
          }
        }
      }
    },

    show: function() {
      if (this.showing) {
        return;
      }

      var me = this;

      var options = this.options;

      var allowHistory = options.allowHistory;

      this.mask.classList.add('visible');

      this.showing = true;

      // allow pushstate
      if (allowHistory) {
        var popstateEvent = function(e) {
          e.preventDefault();

          me.realHide();

          window.removeEventListener('popstate', popstateEvent);
        };

        history.pushState({}, '查看相册');

        window.addEventListener('popstate', popstateEvent);
      }

      return this;
    },

    hide: function() {
      if (!this.showing) {
        return;
      }

      this.mask.classList.remove('visible');

      this.showing = false;
    },

    prev: function() {
      this.go(this.options.cur - 1);
    },

    next: function() {
      this.go(this.options.cur + 1);
    },

    go: function(index, speed) {
      var len = this.length;

      var options = this.options;

      var cur = options.cur;

      // speed = 0, 没有动画
      if (speed == null) {
        speed = options.speed;
      }

      if (index == null) {
        index = cur;
      }

      // 修正index, 回弹不触发
      if (index !== cur) {
        cur = options.cur = this.amend(index);
      }

      this.fire('pagechange', cur);

      this.move(-cur / len * 100, speed);

      this.loadImage(cur);

      for (var i = 1, length = options.preload; i <= length; i++) {
        this.loadImage(cur + i);
        this.loadImage(cur - i);
      }
    },

    amend: function(index) {
      var total = this.length;

      return Math.max(0, Math.min(index, total - 1));
    },

    move: function(dist, speed) {
      var cssText = '' +
        '-webkit-transform: translate3d(' + dist + '%, 0, 0) scale3d(1, 1, 1);' +
        'transform: translate3d(' + dist + '%, 0, 0) scale3d(1, 1, 1);';

      if (this.options.animate) {
        cssText += '' +
          '-webkit-transition: -webkit-transform ' + (speed || 0) + 'ms;' +
          'transition: transform ' + (speed || 0) + 'ms;';
      }

      this.wrapper.style.cssText += cssText;
    },

    dispose: function() {
      document.body.removeChild(this.mask);
    },

    delPic: function(index) {
      var options = this.options;

      var wrapper = this.wrapper;

      var total = this.length;

      if (index == null) {
        index = options.cur;
      }

      index = this.amend(index);

      // only one picture
      if (total === 1) {
        this.fire('delPic', index, total);

        return;
      }

      if (index < total - 1) {
        this.go();
      } else {
        this.prev();
      }

      options.imgSource = options.imgSource.splice(index, 1);

      total = this.length = options.imgSource.length;

      wrapper.removeChild(wrapper.querySelectorAll('[data-role="imageview-item"]')[index]);

      this.refreshImagePos();

      if (options.hasToolBar) {
        this.main.querySelector('[data-role="totalPic"]').textContent = total;
      }

      this.fire('delPic', index, total);
    },

    addPic: function() {

    }
  };

  /**
   * 缩放图片居中显示
   *
   * @param {HTMLElement} img 图片源
   * @param {Object} size 缩放到的尺寸 {width:,height:}
   * @param {number=} scale 用于美化的缩放比例
   */
  function imageResizeToCenter(img, size, scale) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var sw = size.width;
    var sh = size.height;

    // 不传则不缩放
    scale = scale || 1;

    // 先以宽为基准缩放
    if (w > sw) {
      h *= sw / w;
      w = sw;
    }

    // 再以高为基准缩放
    if (h > sh) {
      w *= sh / h;
      h = sh;
    }

    // 考虑美观，再稍微缩放一点，让图片四周多点间距
    w *= scale;
    h *= scale;

    img.style.width = w + 'px';
    img.style.height = h + 'px';
    img.style['margin-top'] = 0;

    // 高度不足, 需垂直居中（水平居中CSS已处理了）
    if (h < sh) {
      img.style['margin-top'] = Math.round(Math.max((sh - h) / 2, 0)) + 'px';
    }
  }

  /**
   * 复制source属性到target，覆盖target同名属性
   *
   * @param {Object} target 目标对象
   * @param {Object=} source 源对象
   * @return {Object} target
   */
  function extend(target, source) {
    for (var i = 1, len = arguments.length; i < len; i++) {
      source = arguments[i];

      if (!source) {
        continue;
      }

      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  Emitter.mixTo(ImageView);

  module.exports = ImageView;
});
