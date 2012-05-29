var path = require('path');
var env = require('../lib/env');

exports.absolute = function(test) {
	test.ok(env.isAbsolute('/'));
	test.ok(env.isAbsolute('/abc/xyz/'));
	test.ok(env.isAbsolute('/abc/../xyz'));
	test.ok(env.isAbsolute('/.'));

	if ( env.isWindows ) {
		test.ok(env.isAbsolute('C:/'));
		test.ok(env.isAbsolute('C:/abc'));
		test.ok(env.isAbsolute('C:/abc/xyz'));
		test.ok(env.isAbsolute('C:\\'));
		test.ok(env.isAbsolute('C:\\abc\\'));
		test.ok(env.isAbsolute('C:\\abc\\xyz'));
		test.ok(env.isAbsolute('c:/'));
		test.ok(env.isAbsolute('c:/abc'));
		test.ok(env.isAbsolute('c:/abc/xyz'));
		test.ok(env.isAbsolute('c:\\'));
		test.ok(env.isAbsolute('c:\\abc\\'));
		test.ok(env.isAbsolute('c:\\abc\\xyz'));
	}

	test.ok(!env.isAbsolute('./'));
	test.ok(!env.isAbsolute('abc/xyz/'));
	test.ok(!env.isAbsolute('abc/../xyz'));
	test.ok(!env.isAbsolute('.'));

	if ( env.isWindows ) {
		test.ok(!env.isAbsolute('C:'));
		test.ok(!env.isAbsolute('C:abc'));
		test.ok(!env.isAbsolute('C:abc/xyz'));
		test.ok(!env.isAbsolute('C:'));
		test.ok(!env.isAbsolute('C:abc\\'));
		test.ok(!env.isAbsolute('C:abc\\xyz'));
		test.ok(!env.isAbsolute('c:'));
		test.ok(!env.isAbsolute('c:abc'));
		test.ok(!env.isAbsolute('c:abc/xyz'));
		test.ok(!env.isAbsolute('c:'));
		test.ok(!env.isAbsolute('c:abc\\'));
		test.ok(!env.isAbsolute('c:abc\\xyz'));
	}

	test.done();
}