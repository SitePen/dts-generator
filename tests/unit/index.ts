import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import fs = require('intern/dojo/node!fs');
import dtsGenerator = require('intern/dojo/node!../../index');

registerSuite({
	name: 'index',
	'api': function () {
		assert(dtsGenerator);
		assert.isFunction(dtsGenerator.generate);
	},
	'generate': function () {
		return dtsGenerator.generate({
			name: 'foo',
			baseDir: 'tests/support/foo',
			files: [ 'index.ts' ],
			out: 'tmp/foo.d.ts'
		}).then(function () {
			let output = fs.readFileSync('tmp/foo.d.ts', { encoding: 'utf8' });
			assert.include(output, 'declare module \'foo/Bar\'', 'should include module foo/Bar');
			assert.include(output, 'declare module \'foo/index\'', 'should include module foo/index');
		});
	},
	'abstract': function () {
		return dtsGenerator.generate({
			name: 'abstract',
			baseDir: 'tests/support/abstract',
			files: [ 'abstract.ts' ],
			out: 'tmp/abstract.d.ts'
		}).then(function () {
			let output = fs.readFileSync('tmp/abstract.d.ts', { encoding: 'utf8' });
			assert(output, 'the output file should have contents');
			assert.include(output, 'export abstract class Foo', 'should contain abstract class');
			assert.include(output, 'export class MyFoo implements Foo',
				'should contain implementation of abstract class');
		});
	}
});
