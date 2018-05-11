import baseRules, {Token, Rules} from "./rules";

export type Context = {
	[path: string]: {
		[pattern: string]: string | {
			ctx: string;
			loc: string;
		};
	};
};

const baseCompiledRules = compileRules(baseRules);

export function parse(input: string, context: Context, rules: Rules = {}) {
	const root = [];
	const parseRules = compileRules(rules).concat(baseCompiledRules);
	const compiledContext = Object.entries(context).map(([name, values]) => {
		return {
			regexp: new RegExp(`^${name
						.replace(/\/\*\*\//g, '(?:/.+)?/')
						.replace(/\/\*/g, '(?:\\/[^\/]+/?$|$)')
					}$`, 'i'),
			entries: Object.entries(values).map(([pattern, value]) => ({
				regexp: new RegExp(`^${pattern}$`, 'i'),
				value,
			}))
		};
	});

	let prev = null;
	let parent = null;
	let parentIndent = 0;

	input.split('\n').forEach(line => {
		if (!line.trim()) {
			return;
		}

		let indent = line.match(/^\s*/)[0].length;
		let inLine = false;

		if (parentIndent !== indent) {
			parent = prev;
			parentIndent = indent;
		}

		for (let idx = 0; idx < parseRules.length; idx++) {
			const rule = parseRules[idx];
			const match = line.trim().match(rule.regexp);

			if (match !== null) {
				const token = rule.exec({
					match,
					parent,
				});

				if (token !== null) {
					const {target} = token;

					if (parent === null) {
						root.push(token);
					} else {
						token.parent = parent;
						!parent.nested && (parent.nested = []);
						parent.nested.push(token);
					}

					if (target) {
						const t = findInContext(token, compiledContext);

						if (!t) {
							throw new Error(`Unrecognized target: ${target}`);
						}

						if (t.value.ctx) {
							token.target = t.value.loc;
							token.ctx = t.value.ctx;
						} else {
							token.target = t.value;
						}
					} else if (parent) {
						token.target = parent.target;
					} else if (token.defaultTarget) {
						token.target = token.defaultTarget;
					} else if (token.target !== null) {
						throw new Error(`Unrecognized target for token: ${JSON.stringify(token)}`);
					}

					delete token.defaultTarget;
					prev = token;
				}

				line = line.substr(match[0].length + indent).trim();
				indent = 0;

				if (line === '') {
					if (inLine) {
						parent = prev.parent;
					}
					return;
				} else {
					idx = 0;
					parent = prev;
					inLine = true;
				}
			}
		}

		throw new Error(`Unrecognized expression: ${line}`);
	});

	return root;
}


function findInContext(token, context) {
	const chain = [];
	const {target} = token;
	let x = token;

	do {
		if (x.ctx) {
			chain.unshift(x.ctx);
		}
	} while (x = x.parent);

	if (!chain.length) {
		chain.push(token.type.split(':')[0]);
	}

	// console.log(chain);

	return (
		context.find(x => x.regexp.test(chain.join('/'))) ||
		context.find(x => x.regexp.test('globals'))
	).entries.find(t => t.regexp.test(target)) || null;
}

function compileRules(rules: Rules) {
	return Object.entries(rules || {}).map(([pattern, exec]) => {
		const params = [];

		pattern = pattern
			.trim()
			.replace(/\s*\(target\)/g, '(?: "([^"]+)")')
			.replace(/\s+/g, '\\s+')
		;

		return {
			pattern,
			params,
			exec,
			regexp: new RegExp(`^${pattern}`, 'i'),
		};
	})
}