var path = require('path'),
	sets = require('simplesets'),
    settings = require('../lib/settings'),
	Packer = require('../lib/packer.js');

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
			Packer({path: pkgPath, bundledDependencies: cfg.bundledDependencies }).
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

exports.basicPackage = testPackage('pack_basic', ['kanso.json','README.md']);
exports.ignoreFile = testPackage('pack_with_ignored_files', ['.kansoignore','kanso.json','README.md']);
exports.pack_with_deps = testPackage('pack_with_deps', ['index.html','kanso.json']);
exports.pack_with_bundled_deps = testPackage('pack_with_bundled_deps', ['example.js','kanso.json', 'packages/bundledpkg/kanso.json', 'packages/bundledpkg/packages/inner_package/README.md']);
