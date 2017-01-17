import FooInterfaceExportAssignment = require('./FooInterfaceExportAssignment');

class FooImplExportAssignment implements FooInterfaceExportAssignment {
	public sayHello(name: string): string {
		return `Hello $name`;
	}
}

export = FooImplExportAssignment