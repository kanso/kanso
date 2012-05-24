var path = require('path'),
	sets = require('simplesets'),
    settings = require('../lib/settings'),
	PackageDirReader = require('../lib/package-dir-reader.js');

function packagePath(pkg) {
	return path.resolve(__dirname,'testapps', pkg);
}

function sameSet(test, actual, expected, message) {
	actual = new sets.Set(actual);
	expected = new sets.Set(expected);
	test.ok(actual.equals(expected), message +
		"\n The following items were missing: [" + expected.difference(actual).array().join(', ') + ']' +
		"\n The following items were not expected: [" + actual.difference(expected).array().join(', ') + "]");
}

function testPackage(pkg, expectedPaths) {
	var pkgPath = packagePath(pkg);
	expectedPaths = expectedPaths.map(function(p) {return path.normalize(p);});
	return function(test) {
		var actualPaths = [];

		settings.load(pkgPath, function(err, cfg) {
			PackageDirReader({path: pkgPath, bundledDependencies: cfg.bundledDependencies }).
			on('error', function(err) {
				test.fail(err);
				test.done();
			}).
			on('entry', function(entry) {
				actualPaths.push(path.relative(pkgPath, entry.path));
			}).
			on('close', function() {
				sameSet(test, actualPaths, expectedPaths, "Should contain the same list of paths");
				test.done();
			});
		});
	};
}

exports.basicPackage = testPackage('pack_basic', ['package/kanso.json','package/README.md','package/lib/Test.txt']);
exports.ignoreFile = testPackage('pack_with_ignored_files', ['package/.kansoignore','package/kanso.json','package/README.md']);
exports.pack_with_deps = testPackage('pack_with_deps', ['package/index.html','package/kanso.json']);
exports.pack_with_bundled_deps = testPackage('pack_with_bundled_deps', ['package/example.js','package/kanso.json', 'package/packages/bundledpkg/kanso.json', 'package/packages/bundledpkg/packages/inner_package/README.md']);
