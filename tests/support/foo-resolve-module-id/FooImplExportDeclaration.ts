import { FooInterfaceExportDeclaration } from './FooInterfaceExportDeclaration';

export class FooImplExportDeclaration implements FooInterfaceExportDeclaration {
	public sayHello(name: string): string {
		return `Hello $name`;
	}
}