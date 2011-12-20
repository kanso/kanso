_compListener() {
  local curw
  COMPREPLY=()
  curw=${COMP_WORDS[COMP_CWORD]}

  COMPREPLY=($(kanso_completions ${COMP_WORDS[@]}))
  return 0
}
#complete -F _compListener -o nospace kanso
complete -F _compListener -o filenames kanso
