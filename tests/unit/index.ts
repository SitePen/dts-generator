import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import dtsGenerator = require('intern/dojo/node!../../index');

registerSuite({
	name: 'index',
	'api': function () {
		assert(dtsGenerator);
		assert.isFunction(dtsGenerator.generate);
	},
	'generate': function () {
		dtsGenerator.generate({
			name: 'foo',
			baseDir: 'tests/support/foo',
			files: [ 'index.ts' ],
			out: 'tmp/foo.d.ts'
		});
	},
	'config': function () {
		dtsGenerator.generate({
			config: 'tests/support/foo/tsconfig.json',
			out: 'tmp/foo.config.d.ts'
		});
	}
});
