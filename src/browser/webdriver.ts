import {BrowserAPI, BrowserConfig} from './browser';

const TAB_KEY = '\uE004';
const SHIFT_KEY = '\uE008';

export class WebdriveBrowser implements BrowserAPI, BrowserConfig {
	private page: WebdriverIO.Client<void>;

	timeout: number = 10000;

	constructor(cfg: BrowserConfig) {
		Object.assign(this, cfg);
		this.page = browser;
	}

	async title() {
		return this.page.title;
	}

	async getContent() {
		return this.page.getHTML();
	}

	async setContent(html) {
		return Promise.reject(new Error('Not supported'));
	}

	async url(u) {
		this.page.url(u);
		return true;
	}

	async close() {
		this.page.close();
		return true;
	}

	async waitForExists(selector, invert = false, ms = this.timeout): Promise<boolean> {
		try {
			this.page.waitForExist(selector, ms, invert);
		} catch (_) {
			return false;
		}
		return true;
	}

	async waitForVisible(selector, invert = false, ms = this.timeout): Promise<boolean> {
		try {
			this.page.waitForVisible(selector, ms, invert);
		} catch (_) {
			return false;
		}
		return true;
	}

	async exists(selector, invert = false): Promise<boolean> {
		return (+this.page.isExisting(selector) ^ +invert) === 1;
	}

	async visible(selector, invert = false): Promise<boolean> {
		return this.waitForVisible(selector, invert, 5).catch(() => false);
	}

	async getProperty(selector, name, fromParent?) {
		/* istanbul ignore next */
		const {value} = browser.execute(function (selector, name, fromParent) {
			var el = document.querySelector(selector);
			return el && (fromParent ? el.parentNode : el)[name];
		}, selector, name, fromParent);

		return value;
	}

	async click(selector) {
		this.page.click(selector);
		return true;
	}

	async childElementCount(selector) {
		return this.getProperty(selector, 'childElementCount');
	}

	async moveFocus(direct: 'next' | 'prev') {
		if (direct === 'prev') {
			this.page.keys([SHIFT_KEY, TAB_KEY]);
			this.page.keys(SHIFT_KEY);
		} else {
			this.page.keys(TAB_KEY);
		}

		this.page.pause(300);

		return true;
	}

	async isActiveElement(selector: string) {
		/* istanbul ignore next */
		return this.page.execute(function (selector) {
			var list = document.querySelectorAll(selector);
			var idx = list.length;

			while (idx--) {
				if (list[idx] === document.activeElement) {
					return true;
				}
			}

			return false;
		}, selector).value;
	}

	async type(selector: string, value: string) {
		this.page.setValue(selector, value);
		return true;
	}
}