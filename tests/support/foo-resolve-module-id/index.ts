import FooImplExportAssignment = require('./FooImplExportAssignment');
import { FooImplExportDeclaration } from './FooImplExportDeclaration';
export { ReExport } from './ReExport';
import { ClassInJavaScript } from 'SomethingInJavaScript';
import { NonRelative } from 'NonRelative';

export function fooImplExportAssignment(): FooImplExportAssignment {
	return new FooImplExportAssignment();
}

export function fooImplExportDeclaration(): FooImplExportDeclaration {
	return new FooImplExportDeclaration();
}

export function classInJavaScript(): ClassInJavaScript {
	return new ClassInJavaScript();
}

export function nonRelative(): NonRelative {
	return new NonRelative();
}