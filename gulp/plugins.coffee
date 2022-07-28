sassCompiler = require "sass"
sass = (require "gulp-sass")(sassCompiler)

module.exports =
  compiler:
    ts: require "typescript"
    sass: sassCompiler
    pug: require "pug"
  gulp:
    gulp: require "gulp"
    plumber: require "gulp-plumber"
    filter: require "gulp-filter"
    concat: require "gulp-concat"
    notify: require "gulp-notify"
    merge: require "merge2"
    rename: require "gulp-rename"
    replace: require "gulp-replace"
    sass: sass
    postcss: require "gulp-postcss"
    pug: require "gulp-pug"
  rollup:
    rollup: require "rollup"
    ts: require "rollup-plugin-typescript2"
    replace: require "rollup-plugin-replace"
  postcss:
    autoprefixer: require "autoprefixer"
  other:
    sharp: require "sharp"
    crx3: require "crx3"
    webExt: require "web-ext"
