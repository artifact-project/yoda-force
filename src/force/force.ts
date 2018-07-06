import {parse, Context} from '../parse/parse';
import {baseActions, Actions} from './actions';
import {PageContext} from './context';
import {Token, Rules} from '../parse/rules';
import {BrowserAPI} from '../browser/browser';
import { verbose } from '../verbose';

export type InputValidator = (ctx: PageContext, s: 'valid' | 'invalid') => Promise<boolean>;
export type YodaForceConfig = {
	domIdAttr?: string;
	browser?: BrowserAPI;
	context: Context;
	actions?: Actions;
	rules?: Rules;
	validateInput?: InputValidator;
	getInputRequiredState?: (ctx: PageContext) => Promise<boolean>;
	onactionstart?: (err: Error | null, ctx: PageContext, res: boolean | 'repeat') => void;
	onactionend?: (err: Error | null, ctx: PageContext, res: boolean | 'repeat') => void;
}

export class YodaForce implements YodaForceConfig {
	domIdAttr: string = 'data-qa-id';
	rules: Rules = null;
	browser: BrowserAPI = null;
	context: Context = null;
	actions: Actions = null;
	vars: {[index:string]: string} = {};

	onactionstart = () => {};
	onactionend = () => {};

	getInputRequiredState = (ctx) => ctx.getDOMPropertyValue('required');

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
		const tokens = parse(scenario, this.context, this.rules)

		verbose('~~~~~~~~~ FORCE ~~~~~~~~~~~');

		return (async function walk(nested: Token[] = [], parent: PageContext) {
			let iteration = 0;

			const runTask = async (token: Token) => {
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
				const desc = token.description ? token.description.full : '';
				let promise = null;

				if (type === '#NULL') {
					return walk.call(this, token.nested, ctx);
				} else if (this.actions.hasOwnProperty(type)) {
					const entries = this.actions[type];

					if (entries.hasOwnProperty(target)) {
						promise = entries[target](ctx);
					} else if (entries.hasOwnProperty('*')) {
						promise = entries['*'](ctx);
					} else {
						promise = Promise.reject(new Error(`Unrecognized action for target: ${target}, type: ${type}\n${desc}`.trim()));
					}
				} else {
					promise = Promise.reject(new Error(`Unrecognized action for token type: ${type}\n${desc}`.trim()));
				}

				this.onactionstart(null, ctx);

				promise = promise.then(res => {
					verbose(`[force] "${type}" -> "${target}" -> "${res}"`);

					if (res !== false) {
						let nestedQueue = walk.call(this, token.nested, ctx);

						if (res === 'repeat') {
							nestedQueue = nestedQueue.then(() => {
								if (++iteration > 250) {
									throw new Error(`Infinity logo (type: ${type}, target: ${target})`);
								}

								return runTask(token);
							});
						}

						return nestedQueue;
					} else {
						return res;
					}
				});

				promise.then(
					(res) => this.onactionend(null, ctx, res),
					(err) => this.onactionend(err, ctx),
				);

				return promise;
			};

			for (let i = 0; i < nested.length; i++) {
				await runTask(nested[i]);
			}

			return true;
		}).call(this, tokens, page);
	}
}