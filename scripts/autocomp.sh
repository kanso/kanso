_compListener() {
  local curw
  COMPREPLY=()
  curw=${COMP_WORDS[COMP_CWORD]}
  # TODO: set autocomp.js path in Makefile
  COMPREPLY=($(/usr/local/lib/node/kanso/scripts/autocomp.js ${COMP_WORDS[@]}))
  return 0
}
complete -F _compListener kanso
