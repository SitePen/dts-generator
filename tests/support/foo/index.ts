import Bar from './Bar';

export default class Foo {
	bar: Bar;
	constructor () {
		this.bar = new Bar();
	}
}
