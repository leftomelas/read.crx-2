import ContextMenu from "./ContextMenu.coffee"
import TableSearch from "./TableSearch.coffee"

###*
@class ThreadList
@constructor
@param {Element} table
@param {Object} option
  @param {Boolean} [option.bookmark=false]
  @param {Boolean} [option.title=false]
  @param {Boolean} [option.boardTitle=false]
  @param {Boolean} [option.res=false]
  @param {Boolean} [option.unread=false]
  @param {Boolean} [option.heat=false]
  @param {Boolean} [option.createdDate=false]
  @param {Boolean} [option.viewedDate=false]
  @param {Boolean} [option.bookmarkAddRm=false]
  @param {Element} [option.searchbox]
###
export default class ThreadList
  constructor: (@table, option) ->
    ###*
    @property _flg
    @type Object
    @private
    ###
    @_flg =
      bookmark: false
      title: false
      boardTitle: false
      res: false
      writtenRes: false
      unread: false
      heat: false
      name: false
      mail: false
      message: false
      createdDate: false
      viewedDate: false
      writtenDate: false

      bookmarkAddRm: !!option.bookmarkAddRm
      searchbox: undefined

    keyToLabel =
      bookmark: "★"
      title: "タイトル"
      boardTitle: "板名"
      res: "レス数"
      writtenRes: "レス番号"
      unread: "未読数"
      heat: "勢い"
      name: "名前"
      mail: "メール"
      message: "本文"
      createdDate: "作成日時"
      viewedDate: "閲覧日時"
      writtenDate: "書込日時"

    $table = @table
    $thead = $__("thead")
    $table.addLast($thead, $__("tbody"))
    $tr = $__("tr")
    $thead.addLast($tr)

    #項目のツールチップ表示
    $table.on("mouseenter", ({target}) ->
      if target.tagName is "TD"
        await app.defer()
        target.title = target.textContent
      return
    , true)
    $table.on("mouseleave", ({target}) ->
      if target.tagName is "TD"
        target.removeAttr("title")
      return
    , true)

    $cols = $_F()
    selector = {}
    column = {}
    i = 0
    for key, val of keyToLabel when key in option.th
      i++
      className = key.replace(/([A-Z])/g, ($0, $1) -> "_" + $1.toLowerCase())
      $th = $__("th").addClass(className)
      $th.textContent = val
      $th.dataset.key = className
      $tr.addLast($th)
      @_flg[key] = true
      selector[key] = "td:nth-child(#{i})"
      column[key] = i
      $col = $__("col").addClass(className)
      $col.span = 1
      $cols.addLast($col)
    $table.addFirst($cols)

    #ブックマーク更新時処理
    app.message.on("bookmark_updated", ({type, bookmark}) =>
      return if bookmark.type isnt "thread"

      if type is "expired"
        $tr = $table.$("tr[data-href=\"#{bookmark.url}\"]")
        if $tr?
          if bookmark.expired
            $tr.addClass("expired")
            if app.config.isOn("bookmark_show_dat")
              $tr.removeClass("hidden")
            else
              $tr.addClass("hidden")
          else
            $tr.removeClass("expired")

      if type is "errored"
        $tr = $table.$("tr[data-href=\"#{bookmark.url}\"]")
        $tr?.addClass("errored")

      if type is "updated"
        $tr = $table.$("tr[data-href=\"#{bookmark.url}\"]")
        $tr?.removeClass("errored")

      if @_flg.bookmark
        if type is "added"
          $tr = $table.$("tr[data-href=\"#{bookmark.url}\"]")
          $tr?.$(selector.bookmark).textContent = "★"
        else if type is "removed"
          $tr = $table.$("tr[data-href=\"#{bookmark.url}\"]")
          $tr?.$(selector.bookmark).textContent = ""

      if @_flg.bookmarkAddRm
        if type is "added"
          url = new app.URL.URL(bookmark.url)
          boardUrl = url.toBoard()
          try
            boardTitle = await app.BoardTitleSolver.ask(boardUrl)
          catch
            boardTitle = ""
          @addItem({
            title: bookmark.title
            url: bookmark.url
            resCount: bookmark.resCount or 0
            readState: bookmark.readState or null
            createdAt: /\/(\d+)\/$/.exec(url.pathname)[1] * 1000
            boardUrl: boardUrl.href
            boardTitle
            expired: bookmark.expired
            isHttps: url.isHttps()
          })
        else if type is "removed"
          $table.$("tr[data-href=\"#{bookmark.url}\"]").remove()

      if @_flg.res and type is "res_count"
        tr = $table.$("tr[data-href=\"#{bookmark.url}\"]")
        if tr
          td = tr.$(selector.res)
          oldResCount = +td.textContent
          td.textContent = bookmark.resCount
          td.dataset.beforeres = oldResCount
          if @_flg.unread
            td = tr.$(selector.unread)
            oldUnread = +td.textContent
            unread = oldUnread + (bookmark.resCount - oldResCount)
            td.textContent = unread or ""
            if unread > 0
              tr.addClass("updated")
            else
              tr.removeClass("updated")
          if @_flg.heat
            td = tr.$(selector.heat)
            td.textContent = ThreadList._calcHeat(
              Date.now()
              /\/(\d+)\/$/.exec(bookmark.url)[1] * 1000
              bookmark.resCount
            )

      if @_flg.title and type is "title"
        $tr = $table.$("tr[data-href=\"#{bookmark.url}\"]")
        $tr?.$(selector.title).textContent = bookmark.title
      return
    )

    #未読数更新
    if @_flg.unread
      app.message.on("read_state_updated", ({read_state}) ->
        tr = $table.$("tr[data-href=\"#{read_state.url}\"]")
        if tr
          res = tr.$(selector.res)
          if +res.textContent < read_state.received
            res.textContent = read_state.received
          unread = tr.$(selector.unread)
          unreadCount = Math.max(+res.textContent - read_state.read, 0)
          unread.textContent = unreadCount or ""
          if unreadCount > 0
            tr.addClass("updated")
          else
            tr.removeClass("updated")
        return
      )

      app.message.on("read_state_removed", ({url}) ->
        tr = $table.$("tr[data-href=\"#{url}\"]")
        if tr
          tr.$(selector.unread).textContent = ""
          tr.removeClass("updated")
        return
      )

    #リスト内検索
    if typeof option.searchbox is "object"
      titleIndex = column.title
      $searchbox = option.searchbox

      $searchbox.on("compositionend", ->
        @emit(new Event("input"))
        return
      )
      $searchbox.on("input", ({isComposing}) ->
        return if isComposing
        if @value isnt ""
          TableSearch($table, "search",
            query: @value, target_col: titleIndex)
          hitCount = $table.dataset.tableSearchHitCount
          for dom in @parent().child() when dom.hasClass("hit_count")
            dom.textContent = hitCount + "hit"
        else
          TableSearch($table, "clear")
          for dom in @parent().child() when dom.hasClass("hit_count")
            dom.textContent = ""
        return
      )
      $searchbox.on("keyup", ({key}) ->
        if key is "Escape"
          @value = ""
          @emit(new Event("input"))
        return
      )

    #コンテキストメニュー
    if @_flg.bookmark or @_flg.bookmarkAddRm or @_flg.writtenRes or @_flg.viewedDate
      do =>
        $table.on("contextmenu", (e) =>
          $tr = e.target.closest("tbody > tr")
          return unless $tr
          e.preventDefault()

          await app.defer()
          $menu = $$.I("template_thread_list_contextmenu").content.$(".thread_list_contextmenu").cloneNode(true)
          $table.closest(".view").addLast($menu)

          url = $tr.dataset.href

          if app.bookmark.get(url)
            $menu.C("add_bookmark")[0]?.remove()
          else
            $menu.C("del_bookmark")[0]?.remove()

          if (
            not @_flg.unread or
            not /^\d+$/.test($tr.$(selector.unread).textContent) or
            app.bookmark.get(url)?
          )
            $menu.C("del_read_state")[0]?.remove()

          $menu.on("click", fn = ({target}) ->
            return if target.tagName isnt "LI"
            $menu.off("click", fn)

            return unless $tr?

            threadURL = $tr.dataset.href
            threadTitle = $tr.$(selector.title)?.textContent
            threadRes = parseInt($tr.$(selector.res)?.textContent ? 0)
            threadWrittenRes = parseInt($tr.$(selector.writtenRes)?.textContent ? 0)
            dateValue = $tr.$(selector.viewedDate)?.getAttr("date-value")

            switch
              when target.hasClass("add_bookmark")
                app.bookmark.add(threadURL, threadTitle, threadRes)
              when target.hasClass("del_bookmark")
                app.bookmark.remove(threadURL)
              when target.hasClass("del_history")
                app.History.remove(threadURL, +dateValue)
                $tr.remove()
              when target.hasClass("del_writehistory")
                app.WriteHistory.remove(threadURL, threadWrittenRes)
                $tr.remove()
              when target.hasClass("ignore_res_number")
                $tr.setAttr("ignore-res-number", "on")
                $tr.emit(new Event("mousedown", {bubbles: true}))
              when target.hasClass("del_read_state")
                app.ReadState.remove(threadURL)

            @remove()
            return
          )
          ContextMenu($menu, e.clientX, e.clientY)
          return
        )
      return
    return

  ###*
  @method _calcHeat
  @static
  @private
  @param {Number} now
  @param {Number} created
  @param {Number} resCount
  @return {String}
  ###
  @_calcHeat: (now, created, resCount) ->
    if not /^\d+$/.test(created)
      created = (new Date(created)).getTime()
    if created > now
      return "0.0"
    elapsed = Math.max((now - created) / 1000, 1) / (24 * 60 * 60)
    return (resCount / elapsed).toFixed(1)

  ###*
  @method _dateToString
  @static
  @private
  @param {Date}
  @return {String}
  ###
  @_dateToString: do ->
    fn = (a) -> (if a < 10 then "0" else "") + a
    return (date) ->
      return date.getFullYear() +
        "/" + fn(date.getMonth() + 1) +
        "/" + fn(date.getDate()) +
        " " + fn(date.getHours()) +
        ":" + fn(date.getMinutes())

  ###*
  @method addItem
  @param {Object|Array}
  ###
  addItem: (arg) ->
    unless Array.isArray(arg) then arg = [arg]

    $tbody = @table.$("tbody")
    now = Date.now()

    $fragment = $_F()

    for item in arg
      $tr = $__("tr").addClass("open_in_rcrx")

      $tr.addClass("expired") if item.expired
      $tr.addClass("ng_thread") if item.ng
      $tr.addClass("net") if item.isNet
      $tr.addClass("https") if item.isHttps

      if item.expired and not app.config.isOn("bookmark_show_dat")
        $tr.addClass("hidden")

      $tr.dataset.href = app.escapeHtml(item.url)
      $tr.dataset.title = app.escapeHtml(item.title)

      if item.threadNumber?
        $tr.dataset.threadNumber = app.escapeHtml(""+item.threadNumber)
      if @_flg.writtenRes and item.res > 0
        $tr.dataset.writtenResNum = item.res

      #ブックマーク状況
      if @_flg.bookmark
        $td = $__("td")
        if app.bookmark.get(item.url)
          $td.textContent = "★"
        $tr.addLast($td)

      #タイトル
      if @_flg.title
        $td = $__("td")
        $td.textContent = item.title
        $tr.addLast($td)

      #板名
      if @_flg.boardTitle
        $td = $__("td")
        $td.textContent = item.boardTitle
        $tr.addLast($td)

      #レス数
      if @_flg.res
        $td = $__("td")
        if item.resCount > 0
          $td.textContent = item.resCount
        $tr.addLast($td)

      #レス番号
      if @_flg.writtenRes
        $td = $__("td")
        if item.res > 0
          $td.textContent = item.res
        $tr.addLast($td)

      #未読数
      if @_flg.unread
        $td = $__("td")
        if item.readState and item.resCount > item.readState.read
          $td.textContent = (item.resCount - item.readState.read)
          $tr.addClass("updated")
        $tr.addLast($td)

      #勢い
      if @_flg.heat
        $td = $__("td")
        $td.textContent = ThreadList._calcHeat(now, item.createdAt, item.resCount)
        $tr.addLast($td)

      #名前
      if @_flg.name
        $td = $__("td")
        $td.textContent = item.name
        $tr.addLast($td)

      #メール
      if @_flg.mail
        $td = $__("td")
        $td.textContent = item.mail
        $tr.addLast($td)

      #本文
      if @_flg.message
        $td = $__("td")
        $td.textContent = item.message
        $tr.addLast($td)

      #作成日時
      if @_flg.createdDate
        $td = $__("td")
        $td.textContent = ThreadList._dateToString(new Date(item.createdAt))
        $tr.addLast($td)

      #閲覧日時
      if @_flg.viewedDate
        $td = $__("td")
        $td.setAttr("date-value", item.date)
        $td.textContent = ThreadList._dateToString(new Date(item.date))
        $tr.addLast($td)

      #書込日時
      if @_flg.writtenDate
        $td = $__("td")
        $td.textContent = ThreadList._dateToString(new Date(item.date))
        $tr.addLast($td)

      $fragment.addLast($tr)

    $tbody.addLast($fragment)
    return

  ###*
  @method empty
  ###
  empty: ->
    @table.$("tbody").innerHTML = ""
    return

  ###*
  @method getSelected
  @return {Element|null}
  ###
  getSelected: ->
    return @table.$("tr.selected")

  ###*
  @method select
  @param {Element|number} tr
  ###
  select: (target) ->
    @clearSelect()

    if typeof target is "number"
      target = @table.$("tbody > tr:nth-child(#{target}), tbody > tr:last-child")

    return unless target

    target.addClass("selected")
    target.scrollIntoView(behavior: "instant", block: "center", inline: "center")
    return

  ###*
  @method selectNext
  @param {number} [repeat = 1]
  ###
  selectNext: (repeat = 1) ->
    current = @getSelected()

    if current
      for [0...repeat]
        prevCurrent = current
        current = current.next()

        while current and current.offsetHeight is 0
          current = current.next()

        if not current
          current = prevCurrent
          break
    else
      current = @table.$("tbody > tr")

    if current
      @select(current)
    return

  ###*
  @method selectPrev
  @param {number} [repeat = 1]
  ###
  selectPrev: (repeat = 1) ->
    current = @getSelected()

    if current
      for [0...repeat]
        prevCurrent = current
        current = current.prev()

        while current and current.offsetHeight is 0
          current = current.prev()

        if not current
          current = prevCurrent
          break
    else
      current = @table.$("tbody > tr")

    if current
      @select(current)
    return

  ###*
  @method clearSelect
  ###
  clearSelect: ->
    @getSelected()?.removeClass("selected")
    return
