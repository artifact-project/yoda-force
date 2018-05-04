export type PageContextConfig = {
	invert?: boolean;
	selector: string;

	browser: WebdriverIO.Client<void>;
	page?: PageContext;
	parent?: PageContext | null;
}

export class PageContext {
	readonly invert: boolean = false;
	readonly selector: string = null;

	readonly page: PageContext;
	readonly parent: PageContext | null = null;
	readonly browser: WebdriverIO.Client<void>;

	constructor(config: PageContextConfig) {
		Object.assign(this, config);
	}

	private __$(target?: string): string {
		const path = [];
		let ctx: PageContext = this;

		if (target != null) {
			path.push(target);
		}

		do {
			if (ctx.selector !== 'body' || !path.length) {
				path.unshift(ctx.selector);
			}
		} while (ctx = ctx.parent);

		return path.join(' ');
	}

	isExists(target?: string, invert: boolean = this.invert): boolean {
		return (+this.browser.isVisible(this.__$(target)) ^ +invert) === 1;
	}

	isVisible(target?: string, invert: boolean = this.invert): boolean {
		return (+this.browser.isExisting(this.__$(target)) ^ +invert) === 1;
	}

	wait(target?: string, invert: boolean = this.invert): void {
		this.browser.waitForVisible(this.__$(target), null, invert);
	}

	waitExists(target?: string, invert: boolean = this.invert): void {
		this.browser.waitForExist(this.__$(target), null, invert);
	}

	click(target?: string): void {
		this.browser.click(this.__$(target));
	}
}
