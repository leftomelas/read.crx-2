import {ask as askBoardTitleSolver} from "./BoardTitleSolver.coffee"
import {Request} from "./HTTP.ts"
import {stampToDate, decodeCharReference} from "./util.coffee"
import {getProtocol, setProtocol} from "./URL.ts"

export default class
  loaded: "None"
  loaded20: null

  constructor: (@query, @protocol) ->
    return

  _parse = (protocol) ->
    return (item) ->
      url = item.T("guid")[0].textContent
      title = decodeCharReference(item.T("title")[0].textContent)
      m = title.match(/\((\d+)\)$/)
      title = title.replace(/\(\d+\)$/, "")
      boardUrl = (new app.URL.URL(url)).toBoard()
      try
        boardTitle = await askBoardTitleSolver(boardUrl)
      catch
        boardTitle = ""
      return {
        url: setProtocol(url, protocol)
        createdAt: Date.parse(item.T("pubDate")[0].textContent)
        title
        resCount: if m? then m[1] else 0
        boardUrl: boardUrl.href
        boardTitle
        isHttps: (protocol is "https:")
      }
    ###
    return ({url, key, subject, resno, server, ita}) ->
      urlProtocol = getProtocol(url)
      boardUrl = new URL("#{urlProtocol}//#{server}/#{ita}/")
      try
        boardTitle = await askBoardTitleSolver(boardUrl)
      catch
        boardTitle = ""
      return {
        url: setProtocol(url, protocol)
        createdAt: stampToDate(key)
        title: decodeCharReference(subject)
        resCount: +resno
        boardUrl: boardUrl.href
        boardTitle
        isHttps: (protocol is "https:")
      }
    ###

  _read: (count) ->
    #{status, body} = await new Request("GET", "https://dig.5ch.net/?keywords=#{encodeURIComponent(@query)}&maxResult=#{count}&json=1",
    {status, body} = await new Request("GET", "https://ff5ch.syoboi.jp/?q=#{encodeURIComponent(@query)}&alt=rss",
      cache: false
    ).send()
    unless status is 200
      throw new Error("検索の通信に失敗しました")
    try
      parser = new DOMParser()
      rss = parser.parseFromString(body, "application/xml")
      result = Array.from(rss.T("item"))
      #{result} = JSON.parse(body)
    catch
      throw new Error("検索のJSONのパースに失敗しました")
    return Promise.all(result.map(_parse(@protocol)))

  _getDiff = (a, b) ->
    diffed = []
    aUrls = []
    for aVal in a
      aUrls.push(aVal.url)
    for bVal in b when !aUrls.includes(bVal.url)
      diffed.push(bVal)
    return diffed

  read: ->
    if @loaded is "None"
      @loaded = "Big"
      return @_read()
    return []
    ###
    if @loaded is "None"
      @loaded = "Small"
      @loaded20 = @_read(20)
      return @loaded20
    if @loaded is "Small"
      @loaded = "Big"
      return _getDiff(await @loaded20, await @_read(500))
    return []
    ###
