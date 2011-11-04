_compListener() {
  # Additional path for looking up node modules.
  # Used so kanso package pre/postprocessors can do require('kanso/lib/foo')
  KANSO_DIR=/usr/local/lib/node/kanso

  # Extend existing NODE_PATH environment variable
  export NODE_PATH="$KANSO_DIR/src:$KANSO_DIR/deps:$NODE_PATH"

  local curw
  COMPREPLY=()
  curw=${COMP_WORDS[COMP_CWORD]}
  # TODO: set autocomp.js path in Makefile
  COMPREPLY=($(/usr/local/lib/node/kanso/scripts/autocomp.js ${COMP_WORDS[@]}))
  return 0
}
#complete -F _compListener -o nospace kanso
complete -F _compListener -o filenames kanso
