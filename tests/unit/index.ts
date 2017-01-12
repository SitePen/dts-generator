import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import generate from '../../index';
import * as fs from 'fs';

registerSuite({
	name: 'index',
	'api': function () {
		assert.isFunction(generate, 'generate should be a function');
	},
	'generate': function () {
		return generate({
			name: 'foo',
			baseDir: 'tests/support/foo',
			files: [ 'index.ts' ],
			out: 'tmp/foo.d.ts'
		}).then(function () {
			const contents = fs.readFileSync('tmp/foo.d.ts', { encoding: 'utf8' });
			assert(contents, 'foo.d.ts should exist and have contents');
			assert.include(contents, `module 'foo/index'`);
			assert.include(contents, `module 'foo/Bar'`);
		});
	},
	'no files': function () {
		return generate({
			name: 'foo',
			baseDir: 'tests/support/foo',
			out: 'tmp/foo.nofiles.d.ts'
		}).then(function () {
			const contents = fs.readFileSync('tmp/foo.nofiles.d.ts', { encoding: 'utf8' });
			assert(contents, 'foo.nofiles.d.ts should exist and have contents');
			assert.include(contents, `module 'foo/index'`);
			assert.include(contents, `module 'foo/Bar'`);
		});
	},
	'project': function () {
		return generate({
			name: 'foo',
			project: 'tests/support/foo',
			out: 'tmp/foo.config.d.ts'
		}).then(function () {
			const contents = fs.readFileSync('tmp/foo.config.d.ts', { encoding: 'utf8' });
			assert(contents, 'foo.config.d.ts should exist and have contents');
			assert.include(contents, `module 'foo/index'`);
			assert.include(contents, `module 'foo/Bar'`);
		});
	},
	'project json file': function () {
		return generate({
			name: 'foo',
			project: 'tests/support/foo/tsconfig-alt.json',
			out: 'tmp/foo-alt.config.d.ts'
		}).then(function () {
			const contents = fs.readFileSync('tmp/foo-alt.config.d.ts', { encoding: 'utf8' });
			assert(contents, 'foo-alt.config.d.ts should exist and have contents');

			// tsconfig-alt.json includes baz and Bar but not index
			assert.include(contents, `module 'foo/baz'`);
			assert.include(contents, `module 'foo/Bar'`);
			assert.notInclude(contents, `module 'foo/index'`);
		});
	},
	'es6 main module': function () {
		return generate({
			name: 'foo',
			project: 'tests/support/foo-es6',
			out: 'tmp/foo.es6.d.ts',
			main: 'index.ts'
		}).then(function () {
			const contents = fs.readFileSync('tmp/foo.es6.d.ts', { encoding: 'utf8' });
			assert(contents, 'foo.es6.d.ts should exist and have contents');
			// assert.include(contents, `module 'foo/index'`);
			// assert.include(contents, `module 'foo/Bar'`);
		});
	}
});
