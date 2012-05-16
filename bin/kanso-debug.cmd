@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe" --debug-brk "%~dp0\kanso" %*
) ELSE (
  node --debug-brk "%~dp0\kanso" %*
)