import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import generate from 'intern/dojo/node!../../index';
import * as fs from 'intern/dojo/node!fs';

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
	}
});
