export abstract class Foo {
	foo: string;
	bar: number;
}

export class MyFoo implements Foo {
	foo: string = 'foo';
	bar: number = 1;
	qat: string = 'qat';
}
