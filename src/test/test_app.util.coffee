module("app.util.parse_anchor")

test "アンカーが含まれる文字列を解析する", 4, ->
  deepEqual(app.util.parse_anchor("&gt;&gt;1"),
    {data: [{segments: [[1, 1]], target: 1}], target: 1})
  deepEqual(app.util.parse_anchor("&gt;&gt;100"),
    {data: [{segments: [[100, 100]], target: 1}], target: 1})
  deepEqual(app.util.parse_anchor("&gt;&gt;1000"),
    {data: [{segments: [[1000, 1000]], target: 1}], target: 1})
  deepEqual(app.util.parse_anchor("&gt;&gt;10000"),
    {data: [{segments: [[10000, 10000]], target: 1}], target: 1})

test "ハイフンで範囲指定が出来る", 4, ->
  deepEqual(app.util.parse_anchor("&gt;&gt;1-3"),
    {data: [{segments: [[1, 3]], target: 3}], target: 3})
  deepEqual(app.util.parse_anchor("&gt;&gt;10-25"),
    {data: [{segments: [[10, 25]], target: 16}], target: 16})
  deepEqual(app.util.parse_anchor("&gt;&gt;1ー3"),
    {data: [{segments: [[1, 3]], target: 3}], target: 3})
  deepEqual(app.util.parse_anchor("&gt;&gt;1ー3, 4ー6"),
    {data: [{segments: [[1, 3], [4, 6]], target: 6}], target: 6})

test "カンマで区切って複数のアンカーを指定出来る", 3, ->
  deepEqual(app.util.parse_anchor("&gt;&gt;1,2,3 ,"),
    {data: [{segments: [[1, 1], [2, 2], [3, 3]], target: 3}], target: 3})
  deepEqual(app.util.parse_anchor("&gt;&gt;1, 20"),
    {data: [{segments: [[1, 1], [20, 20]], target: 2}], target: 2})
  deepEqual(app.util.parse_anchor("&gt;&gt;1,    2, 3,"),
    {data: [{segments: [[1, 1], [2, 2], [3, 3]], target: 3}], target: 3})

test "範囲指定とカンマ区切りは混合出来る", 1, ->
  deepEqual(app.util.parse_anchor("&gt;&gt;1,2-10,12 ,"),
    {data: [{segments: [[1, 1], [2, 10], [12, 12]], target: 11}], target: 11})

test "\&gt;\"の数は一つでも認識する", 1, ->
  deepEqual(app.util.parse_anchor("&gt;1,2-10,12 ,"),
    {data: [{segments: [[1, 1], [2, 10], [12, 12]], target: 11}], target: 11})

test "全角の\"＞\"も開始文字として認識する", 1, ->
  deepEqual(app.util.parse_anchor("＞1,2-10,12 ,"),
    {data: [{segments: [[1, 1], [2, 10], [12, 12]], target: 11}], target: 11})

test "半角\">\"は開始文字として認識しない", 1, ->
  deepEqual(app.util.parse_anchor(">>1,2-10,12 ,"), {data: [], target: 0})

test "ありえない範囲のアンカーは無視する", 2, ->
  deepEqual(app.util.parse_anchor("&gt;&gt;2-1"), {data: [], target: 0})
  deepEqual(app.util.parse_anchor("&gt;&gt;1-3, 5-1, 4-6, 2002-1"),
    {data: [{segments: [[1, 3], [4, 6]], target: 6}], target: 6})

test "実例テスト", 3, ->
  text = "test"
  deepEqual(app.util.parse_anchor(text), {data: [], target: 0})

  text = """<a href="/bbs/read.cgi/computer/42710/1273732874/11" target="_blank">&gt;&gt;11</a>""";
  deepEqual(app.util.parse_anchor(text),
    {data: [{segments: [[11, 11]], target: 1}], target: 1})

  text = """
    <a href="/bbs/read.cgi/computer/42710/1273732874/1-5" target="_blank">&gt;&gt;1-5</a><br><a href="/bbs/read.cgi/computer/42710/1273732874/2-5" target="_blank">&gt;&gt;2-5</a><br><a href="/bbs/read.cgi/computer/42710/1273732874/1-1000" target="_blank">&gt;&gt;1-1000</a><br><br><a href="/bbs/read.cgi/computer/42710/1273732874/3" target="_blank">&gt;&gt;3</a>--4<br><a href="/bbs/read.cgi/computer/42710/1273732874/3-0" target="_blank">&gt;&gt;3-0</a><br><a href="/bbs/read.cgi/computer/42710/1273732874/3" target="_blank">&gt;&gt;3</a>-a
  """
  deepEqual(app.util.parse_anchor(text),
    {data: [
      {segments: [[1, 5]], target: 5}
      {segments: [[2, 5]], target: 4}
      {segments: [[1, 1000]], target: 1000}
      {segments: [[3, 3]], target: 1}
      {segments: [[3, 3]], target: 1}
    ], target: 1011})

module "app.util.ch_sever_move_detect",
  setup: ->
    @pc11_linux_html = """
      <html>
      <head>
      <script language="javascript">
      window.location.href="http://hibari.2ch.net/linux/"</script>
      <title>2chbbs..</title>
      <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=Shift_JIS">
      </head>
      <body bgcolor="#FFFFFF">
      Change your bookmark ASAP.
      <a href="http://hibari.2ch.net/linux/">GO !</a>
      </body>
      </html>
    """
    @yuzuru_gameswf_html = """
      <html>
      <head>
      <script language="javascript">
      window.location.href="http://uni.2ch.net/gameswf/"</script>
      <title>2chbbs..</title>
      <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=Shift_JIS">
      </head>
      <body bgcolor="#FFFFFF">
      Change your bookmark ASAP.
      <a href="http://uni.2ch.net/gameswf/">GO !</a>
      </body>
      </html>
    """
    return
  teardown: $.mockjaxClear

asyncTest "htmlとして不正な文字列を渡された場合はrejectする", 1, ->
  html = "dummy"
  app.util.ch_server_move_detect("http://pc11.2ch.net/linux/", html)
    .fail ->
      ok(true)
      start()
      return
  return

asyncTest "実例テスト: pc11/linux → hibari/linux (html)", 1, ->
  app.util.ch_server_move_detect("http://pc11.2ch.net/linux/", @pc11_linux_html)
    .done (new_board_url) ->
      strictEqual(new_board_url, "http://hibari.2ch.net/linux/")
      start()
      return
  return

asyncTest "pc11/linux → hibari/linux (xhr)", 1, ->
  $.mockjax
    url: /// ^http://pc11\.2ch\.net/linux/ ///
    responseText: @pc11_linux_html

  app.util.ch_server_move_detect("http://pc11.2ch.net/linux/")
    .done (new_board_url) ->
      strictEqual(new_board_url, "http://hibari.2ch.net/linux/")
      start()
      return
  return

asyncTest "yuzuru/gameswf → hato/gameswf (xhr)", 1, ->
  $.mockjax
    url: /// ^http://yuzuru\.2ch\.net/gameswf/ ///
    responseText: @yuzuru_gameswf_html

  app.util.ch_server_move_detect("http://yuzuru.2ch.net/gameswf/")
    .done (new_board_url) ->
      strictEqual(new_board_url, "http://uni.2ch.net/gameswf/")
      start()
      return
  return

asyncTest "example.com (xhr)", 1, ->
  $.mockjax
    url: /// ^http://example\.com/ ///
    responseText: "<!doctype html><html><head><title></title></head></html>"

  app.util.ch_server_move_detect("http://example.com/")
    .fail ->
      ok(true)
      start()
      return
  return

module "app.util.decode_char_reference", {
  setup: ->
    @test = (a, b) ->
      strictEqual(app.util.decode_char_reference(a), b)
}

test "数値文字参照（十進数）をデコードできる", 5, ->
  @test("&#0161;", "¡")
  @test("&#0165;", "¥")
  @test("&#0169;", "©")
  @test("&#0181;", "µ")
  @test("&#0255;", "ÿ")

test "数値文字参照（十六進数、大文字）をデコードできる", 5, ->
  @test("&#x00A1;", "¡")
  @test("&#x00A5;", "¥")
  @test("&#x00A9;", "©")
  @test("&#x00B5;", "µ")
  @test("&#x00FF;", "ÿ")

test "数値文字参照（十六進数、小文字）をデコードできる", 5, ->
  @test("&#x00a1;", "¡")
  @test("&#x00a5;", "¥")
  @test("&#x00a9;", "©")
  @test("&#x00b5;", "µ")
  @test("&#x00ff;", "ÿ")

test "XML実体参照をデコードできる", 5, ->
  @test("&amp;", "&")
  @test("&lt;", "<")
  @test("&gt;", ">")
  @test("&quot;", "\"")
  @test("&apos;", "'")

test "実例テスト", 3, ->
  @test("★☆★【雲雀|朱鷺】VIP&amp;VIP+運用情報387★☆★",
    "★☆★【雲雀|朱鷺】VIP&VIP+運用情報387★☆★")
  @test("お、おい！&gt;&gt;5が息してねえぞ！",
    "お、おい！>>5が息してねえぞ！")
  @test("【ブログ貼付】 &lt;iframe&gt;タグの不具合 ",
    "【ブログ貼付】 <iframe>タグの不具合 ")

module("app.util.levenshtein_distance")

test "レーベンシュタイン距離を算出する", 15, ->
  fn = (a, b, expected) ->
    strictEqual(
      app.util.levenshtein_distance(a, b)
      expected
      "#{a} : #{b}"
    )
    return

  fn("", "", 0)
  fn("a", "a", 0)
  fn("テスト", "テスト", 0)
  fn("", "a", 1)
  fn("a", "", 1)
  fn("a", "b", 1)
  fn("b", "a", 1)
  fn("test", "test", 0)
  fn("tast", "test", 1)
  fn("test", "tast", 1)
  fn("快晴", "曇天", 2)
  fn("google", "apple", 4)
  fn("apple", "google", 4)
  fn("apple", "     apple", 5)
  fn("aaaaaa", "bbbbbb", 6)

  return

module("app.util.normalize")

test "検索用に文字列を変換する", 5, ->
  fn = (message, a, b) ->
    strictEqual(app.util.normalize(a), b, message)
    return

  fn(
    "全角英数を半角英数に変換"
    "０１２３４５６７８９ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ"
    "0123456789abcdefghijklmnopqrstuvwxyz"
  )
  fn(
    "大文字は小文字に変換"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ"
    "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
  )
  fn(
    "全角スペース/半角スペースを削除"
    "　Google Chrome Ｇｏｏｇｌｅ　Ｃｈｒｏｍｅ "
    "googlechromegooglechrome"
  )
  fn(
    "半角カタカナを平仮名に変換する"
    "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ"
    "をぁぃぅぇぉゃゅょっあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん"
  )
  fn(
    "空文字列も許容する"
    ""
    ""
  )
  return
