import {parse, Context} from '../parse/parse';
import {baseActions, Actions, ActionContext} from './actions';
import {PageContext} from './context';
import {Token} from '../parse/rules';

export type YodaForceConfig = {
	domIdAttr?: string;
	browser?: WebdriverIO.Client<void>;
	context: Context;
	actions?: ActionContext;
}

export class YodaForce {
	domIdAttr = '[data-test-id]';

	browser: WebdriverIO.Client<void> = null;
	context: Context = null;
	actions: Actions = null;

	constructor(config: YodaForceConfig) {
		Object.assign(this, config);

		this.actions = Object.entries(config.actions).reduce((map, [key, entries]) => {
			map[key] = Object.assign(
				baseActions[key] || {},
				entries,
			);

			return map;
		}, {});
	}

	use(scenario: string) {
		const page = new PageContext({
			browser: this.browser,
			selector: 'body',
		});

		(function next(nested: Token[] = [], parent: PageContext) {
			nested.forEach(token => {
				const {type, target} = token;
				const ctx = new PageContext({
					page,
					parent,
					browser: this.browser,
					invert: token.invert,
					selector: target,
				});

				if (this.actions.hasOwnProperty(type)) {
					const entries = this.actions[type];

					if (entries.hasOwnProperty(target)) {
						entries[target](ctx);
					} else if (entries.hasOwnProperty('*')) {
						entries['*'](ctx);
					} else {
						throw new Error(`Unrecognized action for target: ${target}, type: ${type}`);
					}
				} else {
					throw new Error(`Unrecognized action for token type: ${type}`);
				}

				next(token.nested, ctx);
			});
		})(parse(scenario, this.context), page);
	}
}