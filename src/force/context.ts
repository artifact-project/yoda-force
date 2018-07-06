import {ok, equal} from 'assert';
import {Token} from '../parse/rules';
import {BrowserAPI} from '../browser/browser';
import {YodaForce} from './force';

export type PageContextConfig = {
	force: YodaForce
	invert?: boolean;
	selector: string;

	domIdAttr?: string;
	browser: BrowserAPI;
	page?: PageContext;
	parent?: PageContext | null;
	token?: Token | null;
}

export class PageContext {
	readonly domIdAttr: string = 'data-qa-id';
	readonly invert: boolean = false;
	readonly selector: string = null;
	readonly token: Token = null;

	readonly page: PageContext;
	readonly parent: PageContext | null = null;

	private force: YodaForce = null;
	private browser: BrowserAPI;

	constructor(config: PageContextConfig) {
		Object.assign(this, config);
	}

	__$(target?: string): string {
		let selector = this.selector;
		let ctx: PageContext = this;

		if (target != null) {
			selector = selector === 'body' ? target : `${selector} ${target}`;
		}

		// while (selector.includes('&') && (ctx = ctx.parent)) {
		// 	selector = selector.replace('&', ctx.selector);
		// }

		return selector
			.replace(/#([^\[\s]+)(\[.*?$)?/g, `[${this.domIdAttr}="$1"]$2`)
			.replace(/\$([a-zа-я0-9_-]+)/i, (_, name) => this.force.vars[name])
		;
	}

	errTxt(txt: string) {
		return `${txt}\n${this.token ? this.token.description.full : ''}`.trim()
	}

	async useForce(scenario: string) {
		return this.force.use(scenario, this);
	}

	async open(url = this.selector): Promise<boolean> {
		return this.browser.url(url);
	}

	async html(): Promise<string> {
		return this.browser.getContent();
	}

	async exists(target?: string, invert: boolean = this.invert): Promise<boolean> {
		return this.browser.exists(this.__$(target), invert);
	}

	async visible(target?: string, invert: boolean = this.invert): Promise<boolean> {
		return this.browser.visible(this.__$(target), invert);
	}

	async wait(target?: string, invert: boolean = this.invert): Promise<boolean> {
		const selector = this.__$(target);
		ok(
			await this.browser.waitForVisible(selector, invert),
			this.errTxt(`'${selector}' must be ${invert ? 'hidden' : 'visible'}`),
		);
		return true;
	}

	async waitExists(target?: string, invert: boolean = this.invert): Promise<boolean> {
		const selector = this.__$(target);
		ok(
			await this.browser.waitForExists(selector, invert),
			this.errTxt(`'${selector}' must be ${invert ? 'not ' : ''}exists`),
		);
		return true;
	}

	async click(target?: string) {
		return this.browser.click(this.__$(target));
	}

	/** Элемент должен быть задизаблен */
	async waitDOMProperty() {
		const selector = this.__$();

		if (!this.token) {
			throw new Error(`"token" must be defined for ${selector}`);
		}

		const {name, state} = this.token;
		const actualState = await this.browser.getProperty(selector, this.token.name);

		equal(
			actualState,
			state,
			this.errTxt(`DOM Property "${name}" for "${selector}" must be "${state}", but not "${actualState}"`),
		);

		return true;
	}

	// /** Получить значение аттрибута элемента */
	// async getDOMAttributeValue(name: string, useParent?: boolean): any {
	// 	const {value} = this.browser.execute(function (selector, name, useParent) {
	// 		/* MOCK:getDOMAttributeValue */
	// 		var el = document.querySelector(selector);
	// 		return el && (useParent ? el.parentNode : el).getAttribute(name);
	// 	}, this.__$(), name, useParent);

	// 	return value;
	// }

	/** Получить значение свойство элемента */
	async getDOMPropertyValue(name: string);
	async getDOMPropertyValue(target: string, name: string, fromParent?: boolean);
	async getDOMPropertyValue() {
		if (arguments.length > 1) {
			return this.browser.getProperty(this.__$(arguments[0]), arguments[1], arguments[2]);
		} else {
			return this.browser.getProperty(this.__$(), arguments[0]);
		}
	}

	async childElementCount(target?: string) {
		return this.browser.childElementCount(this.__$(target));
	}

	async moveFocus(direct: 'next' | 'prev', steps: number = 1) {
		for (let i = 0; i < steps; i++) {
			await this.browser.moveFocus(direct);
		}

		return true;
	}

	async waitActiveElement(target?: string) {
		const selector = this.__$(target);
		ok(
			await this.browser.isActiveElement(selector),
			this.errTxt(`"${selector}" is not active element`),
		);
		return true;
	}

	async type(value?: string);
	async type(target: string, value: string);
	async type() {
		if (arguments.length > 1) {
			await this.browser.type(this.__$(arguments[0]), arguments[1]);
		} else {
			await this.browser.type(this.__$(), arguments[0] == null ? this.token.value : arguments[0]);
		}
		return true;
	}

	async getValue(target?: string) {
		return this.browser.getValue(this.__$(target));
	}

	async pause(ms: number) {
		return new Promise<boolean>(resolve => {
			setTimeout(() => {
				resolve(true);
			}, ms);
		})
	}

	async waitValidateInputStatus(s: 'valid' | 'invalid') {
		const selector = this.__$()
		const needBlur = await this.browser.isActiveElement(selector);

		needBlur && (await this.browser.moveFocus('next'));
		await this.pause(500);

		const state = await this.force.validateInput(this, s);

		ok(
			state === (s === 'valid'),
			this.errTxt(`"${selector}" must be "${s}" (invalid: ${state})`),
		);

		needBlur && (await this.browser.moveFocus('prev'));

		return true;
	}

	async inputMustBeRequire() {
		ok(
			await this.force.getInputRequiredState(this),
			this.errTxt(`"${this.__$()}" must be required`),
		);

		return true;
	}

	async setVar(name, val) {
		this.force.vars[name] = val;
		return true;
	}
}
