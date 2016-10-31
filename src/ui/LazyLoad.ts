///<reference path="../global.d.ts" />
///<reference path="../app.ts" />

namespace UI {
  "use strict";

  interface MediaPosition {
    top: number;
    offsetHeight: number;
  }
  type HTMLMediaElement = HTMLImageElement | HTMLAudioElement | HTMLVideoElement;

  export class LazyLoad {
    static UPDATE_INTERVAL = 200;

    container: HTMLElement;
    private scroll = false;
    private medias: HTMLMediaElement[] = [];
    private mediaPlaceTable = new Map<HTMLMediaElement, MediaPosition>();
    private updateInterval: number = null;
    private pause: boolean = false;
    private lastScrollTop: number = -1;

    constructor (container: HTMLElement) {
      this.container = container;

      $(this.container).on("scroll", this.onScroll.bind(this));
      $(this.container).on("resize", this.onResize.bind(this));
      $(this.container).on("scrollstart", this.onScrollStart.bind(this));
      $(this.container).on("scrollfinish", this.onScrollFinish.bind(this));
      $(this.container).on("searchstart", this.onSearchStart.bind(this));
      $(this.container).on("searchfinish", this.onSearchFinish.bind(this));
      $(this.container).on("immediateload", "img, video", this.onImmediateLoad.bind(this));
      this.scan();
    }

    private onScroll (): void {
      this.scroll = true;
    }

    private onResize (): void {
      this.mediaPlaceTable.clear();
    }

    public immediateLoad (media: HTMLMediaElement): void {
      if (media.tagName === "IMG" || media.tagName === "VIDEO") {
        if (media.getAttribute("data-src") === null) return;
        this.load(media);
      }
    }

    // スクロール中に無駄な画像ロードが発生するのを防止する
    private onScrollStart(): void {
      this.pause = true;
    }

    private onScrollFinish(): void {
      this.pause = false;
    }

    // 検索中に無駄な画像ロードが発生するのを防止する
    private onSearchStart(): void {
      this.pause = true;
    }

    // 検索による表示位置の変更に対応するため、テーブルをクリアしてから再開する
    private onSearchFinish(): void {
      this.mediaPlaceTable.clear();
      this.pause = false;
    }

    private onImmediateLoad (e): void {
      this.immediateLoad(e.target);
    }

    private load (media: HTMLMediaElement, reverse: boolean = false): void {
      var newImg: HTMLImageElement, attr: Attr, attrs: Attr[];
      var imgFlg: boolean = (media.tagName === "IMG");
      var faviconFlg: boolean = media.classList.contains("favicon");

      // immediateLoadにて処理済みのものを除外する
      if (media.getAttribute("data-src") === null) return;

      newImg = document.createElement("img");

      if (imgFlg && !faviconFlg) {
        attrs = <Attr[]>Array.from(media.attributes)
        for (attr of attrs) {
          if (attr.name !== "data-src") {
            newImg.setAttribute(attr.name, attr.value);
          }
        }
      }

      $(newImg).one("load error", function (e) {
        $(media).replaceWith(this);

        if (e.type === "load") {
          if (reverse === false) {
            $(this).trigger("lazyload-load");
          } else {
            $(this).trigger("lazyload-load-reverse");
          }
          UI.Animate.fadeIn(this);
        }
      });
      $(media).one("loadedmetadata error", function (e) {
        if (imgFlg && (faviconFlg || media.classList.contains("loading"))) {
          return;
        }
        if (e.type !== "error") {
          if (reverse === false) {
            $(this).trigger("lazyload-load");
          } else {
            $(this).trigger("lazyload-load-reverse");
          }
        }
      });

      if (imgFlg && !faviconFlg) {
        media.src = "/img/loading.webp";
        newImg.src = media.getAttribute("data-src");
      } else {
        media.src = media.getAttribute("data-src");
      }
      media.removeAttribute("data-src");
    }

    private watch (): void {
      if (this.updateInterval === null) {
        this.updateInterval = setInterval(() => {
          if (this.scroll) {
            this.update();
            this.scroll = false;
          }
        }, LazyLoad.UPDATE_INTERVAL);
      }
    }

    private unwatch (): void {
      if (this.updateInterval !== null) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    }

    scan (): void {
      this.medias = Array.prototype.slice.call(this.container.querySelectorAll("img[data-src], audio[data-src], video[data-src]"));
      if (this.medias.length > 0) {
        this.update();
        this.watch();
      }
      else {
        this.unwatch();
      }
    }

    private getMediaPosition (media: HTMLMediaElement): MediaPosition {
      var current: HTMLMediaElement;
      var pos: MediaPosition = {top: 0, offsetHeight: 0};

      // 高さが固定の場合のみテーブルの値を使用する
      if (
        app.config.get("image_height_fix") === "on" &&
        this.mediaPlaceTable.has(media)
      ) {
        pos = this.mediaPlaceTable.get(media);
      } else {
        pos.top = 0;
        current = media;
        while (current !== null && current !== this.container) {
          pos.top += current.offsetTop;
          current = <HTMLMediaElement>current.offsetParent;
        }
        pos.offsetHeight = media.offsetHeight;
        this.mediaPlaceTable.set(media, pos);
      }
      return pos;
    }

    update (): void {
      var scrollTop: number, clientHeight: number, reverseMode: boolean = false;
      var pos: MediaPosition;

      scrollTop = this.container.scrollTop;
      clientHeight = this.container.clientHeight;
      if (this.pause === true) return;
      if (
        scrollTop < this.lastScrollTop &&
        scrollTop > this.lastScrollTop - clientHeight
      ) {
        reverseMode = true;
      }
      this.lastScrollTop = scrollTop;

      this.medias = this.medias.filter((media: HTMLMediaElement) => {

        // 逆スクロール時の範囲チェック(lazyload-load-reverseを優先させるため先に実行)
        if (reverseMode === true) {
          var bottom: number, targetHeight: number;

          targetHeight = 0;
          switch (media.tagName) {
            case "IMG":
              targetHeight = parseInt(app.config.get("image_height"));
              break;
            case "VIDEO":
              targetHeight = parseInt(app.config.get("video_height"));
              break;
          }

          pos = this.getMediaPosition(media);
          if (pos.top === 0) return true;
          bottom = pos.top + targetHeight;

          if (
            bottom > this.container.scrollTop &&
            bottom < this.container.scrollTop + this.container.clientHeight
          ) {
            this.load(media, true);
            return false;
          }
        }

        if (media.offsetWidth !== 0) {  //imgが非表示の時はロードしない
          pos = this.getMediaPosition(media);

          if (
            !(pos.top + pos.offsetHeight < scrollTop ||
            scrollTop + clientHeight < pos.top)
          ) {
            this.load(media);
            return false;
          }
        }
        return true;
      });

      if (this.medias.length === 0) {
        this.unwatch();
      }
    }
  }
}
