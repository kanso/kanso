@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\node_modules\nodeunit\bin\nodeunit" %*
) ELSE (
  node "%~dp0\..\node_modules\nodeunit\bin\nodeunit" %*
)