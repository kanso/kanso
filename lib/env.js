exports.temp = process.env.TMPDIR || process.env.TMP || process.env.TEMP ||	( process.platform === "win32" ? "c:\\windows\\temp" : "/tmp" );
exports.home = ( process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME );

if (exports.home) {
	process.env.HOME = exports.home;
} else {
	exports.home = exports.temp;
}
