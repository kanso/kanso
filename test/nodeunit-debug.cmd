@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe" --debug-brk  "%~dp0\..\node_modules\nodeunit\bin\nodeunit" %*
) ELSE (
  node --debug-brk "%~dp0\..\node_modules\nodeunit\bin\nodeunit" %*
)