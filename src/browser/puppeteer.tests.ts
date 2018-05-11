import {PuppeteerBrowser} from './puppeteer';

describe('puppeteer', async () => {
	let browser;

	beforeEach(async () => {
		browser = new PuppeteerBrowser({timeout: 50});

		await browser.setContent(`
			<h1>Hi!</h1>
			<div id="xxx">wow</div>
			<div id="yyy" style="visibility: hidden">hidden</div>
		`);
	});

	afterEach(async () => {
		await browser.close();
	})

	it('textContent', async () => {
		expect(await browser.getProperty('h1', 'textContent')).toBe('Hi!');
	});

	it('exists', async () => {
		expect(await browser.exists('#zzz')).toBe(false);
		expect(await browser.exists('#zzz', true)).toBe(true);
	});

	xit('visible', async () => {
		expect(await browser.visible('#xxx')).toBe(true);
		expect(await browser.visible('#yyy')).toBe(false);
	});
});