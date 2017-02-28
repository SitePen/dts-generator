import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import dtsGenerator from '../../../bin/dts-generator';

registerSuite({
	name: 'bin/dts-generator',
	api: function () {
		assert.isFunction(dtsGenerator, 'dtsGenerator should be a function');
		assert.strictEqual(Object.keys(dtsGenerator).length, 0, 'There should be no other keys');
	},
	basic: function () {
		return dtsGenerator([
			'-prefix',
			'foo',
			'-project',
			'tests/support/foo',
			'-out',
			'tmp/foo.cli.d.ts'
		]);
	}
});
