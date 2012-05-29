@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\kanso" %*
) ELSE (
  node  "%~dp0\kanso" %*
)