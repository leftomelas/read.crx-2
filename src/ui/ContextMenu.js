altParent = null

cleanup = ->
  $$.C("contextmenu_menu")[0]?.remove()
  if altParent
    altParent.removeClass("has_contextmenu")
    altParent.$(".popup.has_contextmenu").removeClass("has_contextmenu")
    altParent.emit(new Event("contextmenu_removed"))
    altParent = null
  return

eventFn = (e) ->
  if e.target?.hasClass("contextmenu_menu") or e.target?.parent()?.hasClass("contextmenu_menu")
    return
  cleanup()
  return

doc = document.documentElement
doc.on("keydown", ({key}) ->
  if key is "Escape"
    cleanup()
  return
)
doc.on("mousedown", eventFn)
doc.on("contextmenu", eventFn)

window.on("blur", ->
  cleanup()
  return
)

ContextMenu = ($menu, x, y, $parent = null) ->
  cleanup()

  $menu.addClass("contextmenu_menu")
  $menu.style.position = "fixed"
  menuWidth = $menu.offsetWidth
  $menu.style.left = "#{x}px"
  $menu.style.top = "#{y}px"
  if $parent
    altParent = $parent
    altParent.addClass("has_contextmenu")

  if window.innerWidth < $menu.offsetLeft + menuWidth
    $menu.style.left = null
    $menu.style.right = "1px"
  if window.innerHeight < $menu.offsetTop + $menu.offsetHeight
    $menu.style.top = "#{Math.max($menu.offsetTop - $menu.offsetHeight, 0)}px"
  return

ContextMenu.remove = ->
  cleanup()
  return

export default ContextMenu
