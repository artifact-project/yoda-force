import * as puppeteer from 'puppeteer';
import {BrowserAPI, BrowserConfig} from './browser';

export class PuppeteerBrowser implements BrowserAPI, BrowserConfig {
	private _browser: Promise<puppeteer.Browser> = null;
	private _page: Promise<puppeteer.Page> = null;

	timeout: number = 10000;

	constructor(cfg: BrowserConfig) {
		Object.assign(this, cfg);
	}

	get browser() {
		if (this._browser === null) {
			this._browser = puppeteer.launch();
		}

		return this._browser;
	}

	get page() {
		if (this._page === null) {
			this._page = this.browser.then(b => b.newPage());
		}
		return this._page;
	}

	async title() {
		return (await this.page).title();
	}

	async getContent() {
		return (await this.page).content();
	}

	async setContent(html) {
		return (await this.page).setContent(html).then(() => true);
	}

	async url(u) {
		return (await this.page).goto(u).then(() => true);
	}

	async close() {
		if (this._browser !== null) {
			(await this.browser).close();
			this._page = null;
			this._browser = null;
		}

		return true;
	}

	async $(selector) {
		return (await this.page).$(selector)
	}

	async waitForExists(selector, invert = false, ms = this.timeout): Promise<boolean> {
		return (await this.page).waitForSelector(selector, {timeout: ms}).then(
			() => !invert,
			() => invert,
		);
	}

	async waitForVisible(selector, invert = false, ms = this.timeout): Promise<boolean> {
		return (await this.page).waitForSelector(selector, {
			visible: true,
			timeout: ms,
		}).then(
			() => !invert,
			() => invert,
		);
	}

	async exists(selector, invert = false): Promise<boolean> {
		return (+((await this.$(selector)) !== null) ^ +invert) === 1;
	}

	async visible(selector, invert = false): Promise<boolean> {
		return this.waitForVisible(selector, invert, 5).catch(() => false);
	}

	async getProperty(selector, name, fromParent?) {
		const el = await this.$(selector);

		if (el == null) {
			throw new Error(`Unable to read property "${name}" for "${selector}", because element not found`);
		}

		/* istanbul ignore next */
		return await (await this.page).evaluate(function (el, name, fromParent) {
			return (fromParent ? el.parentNode : el)[name];
		}, el, name, fromParent);
	}

	async click(selector) {
		await (await this.page).click(selector);
		return true;
	}

	async childElementCount(selector) {
		return this.getProperty(selector, 'childElementCount');
	}

	async moveFocus(direct: 'next' | 'prev') {
		const page = await this.page;

		if (direct === 'prev') {
			await page.keyboard.down('Shift');
			await page.keyboard.press('Tab');
			await page.keyboard.up('Shift');
		} else {
			await page.keyboard.press('Tab');
		}

		await pause(300);

		return true;
	}

	async isActiveElement(selector: string) {
		/* istanbul ignore next */
		return (await this.page).evaluate(function (selector) {
			var list = document.querySelectorAll(selector);
			var idx = list.length;

			while (idx--) {
				if (list[idx] === document.activeElement) {
					return true;
				}
			}

			return false;
		}, selector);
	}

	async type(selector: string, value: string) {
		await (await this.page).type(selector, value, {delay: 25});
		return true;
	}
}

function pause(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}