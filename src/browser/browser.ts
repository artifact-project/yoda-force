export interface BrowserAPI {
	getContent(): Promise<string>;
	setContent(html: string): Promise<boolean>;
	url(u: string): Promise<boolean>;
	close(): Promise<boolean>;
	waitForExists(selector: string, invert: boolean, ms?: number): Promise<boolean>;
	waitForVisible(selector: string, invert: boolean, ms?: number): Promise<boolean>;
	exists(selector: string, invert: boolean): Promise<boolean>;
	visible(selector: string, invert : boolean): Promise<boolean>;
	getProperty(selector: string, name: string, fromParent?: boolean): Promise<any>;
	click(selector: string): Promise<boolean>;
	childElementCount(selector: string): Promise<number>;
	moveFocus(direct: 'next' | 'prev'): Promise<boolean>;
	isActiveElement(selector: string): Promise<boolean>;
	type(selector: string, value: string): Promise<boolean>;
	getValue(selector: string): Promise<string>;
}

export interface BrowserConfig {
	timeout?: number;
}