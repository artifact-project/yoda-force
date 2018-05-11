import {parse, Context} from '../parse/parse';
import {baseActions, Actions} from './actions';
import {PageContext, PageContextConfig} from './context';
import {Token, Rules} from '../parse/rules';
import {BrowserAPI} from '../browser/browser';

export type InputValidator = (ctx: PageContext, s: 'valid' | 'invalid') => Promise<boolean>;
export type YodaForceConfig = {
	domIdAttr?: string;
	browser?: BrowserAPI;
	context: Context;
	actions?: Actions;
	rules?: Rules;
	validateInput?: InputValidator;
}

export class YodaForce implements YodaForceConfig {
	domIdAttr: string = 'data-qa-id';
	rules: Rules = null;
	browser: BrowserAPI = null;
	context: Context = null;
	actions: Actions = null;
	vars: {[index:string]: string} = {};

	validateInput: InputValidator = () => {
		throw new Error('YodaForce: "validateInput" must be configured (passed with YodaForceConfig)');
	};

	constructor(config: YodaForceConfig) {
		Object.assign(this, config);

		this.actions = Object.entries(baseActions).reduce((map, [key, entries]) => {
			map[key] = Object.assign(
				entries,
				map[key] || {},
			);

			return map;
		}, config.actions || {});
	}

	async use(scenario: string, parent: PageContext = null) {
		const page = parent || new PageContext({
			force: this,
			selector: 'body',
			browser: this.browser,
			domIdAttr: this.domIdAttr,
		});

		return (function walk(nested: Token[] = [], parent: PageContext) {
			let iteration = 0;

			return nested.reduce(function currentTask(queue, token) {
				const {type, target} = token;
				const ctx = new PageContext({
					page,
					parent,
					token,
					force: this,
					domIdAttr: this.domIdAttr,
					browser: this.browser,
					invert: token.invert,
					selector: target,
				});
				let promise = null;

				if (this.actions.hasOwnProperty(type)) {
					const entries = this.actions[type];

					if (entries.hasOwnProperty(target)) {
						promise = entries[target](ctx);
					} else if (entries.hasOwnProperty('*')) {
						promise = entries['*'](ctx);
					} else {
						throw new Error(`Unrecognized action for target: ${target}, type: ${type}`);
					}
				} else {
					throw new Error(`Unrecognized action for token type: ${type}`);
				}

				return queue
					.then(() => promise)
					.then(res => {
						// console.log(type, target, res);
						if (res !== false) {
							const p = walk.call(this, token.nested, ctx);

							if (res === 'repeat') {
								return p.then(() => {
									if (++iteration > 250) {
										throw new Error(`Infinity logo (type: ${type}, target: ${target})`);
									}
									return currentTask.call(this, Promise.resolve(), token);
								});
							} else {
								return p;
							}
						} else {
							return false;
						}
					})
				;
			}.bind(this), Promise.resolve());
		}).call(this, parse(scenario, this.context, this.rules), page);
	}
}