/**
 * Some JSDoc for you!
 * @param baz Something
 */
export function baz() {
	console.log('baz');
	return 'baz';
}

/**
 * JSDOC Type Annotation
 */
export type Foo = { bar: string } & { qat: number };

/**
 * Some more JSDOC
 * @param something Blah blah blah
 */
export function qat(something: Foo) {
	return something;
}
