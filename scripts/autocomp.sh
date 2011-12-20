# Remember the absolute path to the autocompleter.
_kanso_autocomp_js=$(dirname "$BASH_SOURCE")/autocomp.js
if [ `uname` = "Darwin" ]; then
    _kanso_autocomp_js=$(ruby -e "puts File.expand_path('$_kanso_autocomp_js')")
else
    _kanso_autocomp_js=$(readlink -f "$_kanso_autocomp_js")
fi

_compListener() {
  local curw
  COMPREPLY=()
  curw=${COMP_WORDS[COMP_CWORD]}

  COMPREPLY=($($_kanso_autocomp_js ${COMP_WORDS[@]}))
  return 0
}
#complete -F _compListener -o nospace kanso
complete -F _compListener -o filenames kanso
