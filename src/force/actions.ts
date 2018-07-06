import {ok} from 'assert';
import {PageContext} from './context';
import {Token} from '../parse/rules';

export type Action = (ctx: PageContext) => Promise<void | boolean | 'repeat'>;

export type Actions = {
	[type: string]: {
		'*'?: Action;
		[target:string]: Action;
	};
}

const IF_COND_COMPARATOR = {
	'<': (a, b) => +a < +b,
	'>': (a, b) => +a > +b,
	'=': (a, b) => a == b,
	'<=': (a, b) => +a <= +b,
	'>=': (a, b) => +a >= +b,
};

export const baseActions: Actions = {
	'page:open': {
		'*': (ctx) => ctx.open(),
	},

	'if:exists': {
		'*': (ctx) => ctx.exists(),
	},

	'if:empty': {
		'*': async (ctx) => {
			const count = await ctx.childElementCount();
			return ctx.invert ? count > 0 : !count;
		},
	},

	'if:visible': {
		'*': (ctx) => ctx.visible(),
	},

	'wait:exists': {
		'*': (ctx) => ctx.waitExists(),
	},

	'wait:visible': {
		'*': (ctx) => ctx.wait(),
	},

	'click': {
		'*': (ctx) => ctx.click(),
	},

	'dom:property': {
		'*': (ctx) => ctx.waitDOMProperty(),
	},

	'if:condition': {
		'*': async (ctx) => {
			if (await ctx.visible()) {
				return checkTokenCondition(
					ctx.token,
					(await ctx.getDOMPropertyValue('textContent')).trim(),
				);
			}

			return false;
		},
	},

	'while:visible': {
		'*': async (ctx) => (await ctx.visible()) ? 'repeat' : false,
	},

	'focus:move': {
		'*': (ctx) => ctx.moveFocus(ctx.invert ? 'prev' : 'next', +ctx.token.value),
	},

	'focus:check': {
		'*': (ctx) => ctx.waitActiveElement(),
	},

	'value:set': {
		'*': async (ctx) => {
			if (ctx.token.required) {
				await ctx.type('');
				await ctx.waitValidateInputStatus('invalid');
			}

			await ctx.type();

			return true;
		},
	},

	'value:required': {
		'*': async (ctx) => ctx.inputMustBeRequire(),
	},

	'value:validate': {
		'*': (ctx) => ctx.waitValidateInputStatus(ctx.invert ? 'invalid' : 'valid'),
	},

	'var:set': {
		'*': async (ctx) => {
			let val = await ctx.getDOMPropertyValue('textContent');
			if (val == null) {
				val = await ctx.getDOMPropertyValue('value');
			}
			await ctx.setVar(ctx.token.name, val);
		},
	},
};

export function checkTokenCondition({name, value}: Token, actualValue) {
	return IF_COND_COMPARATOR[name](actualValue, value);

}