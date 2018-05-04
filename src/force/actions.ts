export type ActionContext = {
	readonly invert: boolean;
	readonly page: null;
	readonly target: string;

	exists(target?: boolean, invert?: boolean): boolean;
	visible(target?: boolean, invert?: boolean): boolean;

	wait(target?: boolean, invert?: boolean): void;
	waitExists(target?: boolean, invert?: boolean): void;

	click(target?: boolean): void;
}

export type Action = (ctx: ActionContext) => void | boolean;

export type Actions = {
	[type: string]: {
		'*'?: Action;
		[target:string]: Action;
	};
}

export const baseActions: Actions = {
	'if:exists': {
		'*': (ctx) => ctx.exists(),
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
};