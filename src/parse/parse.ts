import baseRules, {Token, Rules} from "./rules";
import { verbose } from "../verbose";

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
	let metaGroup: Token = null;
	let parentIndent = 0;

	input.split('\n').forEach(line => {
		if (!line.trim()) {
			return;
		}

		let indent = line.match(/^\s*/)[0].length;
		let inLine = 0; // сколько родителей надо будет открутить назад

		verbose('[parse] cursor:', line.trim(), parent && parent.description || null);

		if (parentIndent === indent && parent) {
			parent = parent.parent || null;
			verbose('[parse] restore parent (1):', parent && parent.description);
		} else if (parentIndent !== indent) {
			// console.log([parentIndent, indent], parentIndent - indent, prev && prev.description)

			if (parentIndent < indent) {
				parent = prev;
				verbose('[parse] set parent (2):', parent && parent.description);
			} else {
				let delta = parentIndent - indent + 1;
				verbose('[parse] restore parent (3):', delta, parent && parent.description);
				while (delta--) {
					parent = parent.parent || null;
				}
				verbose('[parse] restore parent (4):', delta, parent && parent.description);
			}

			metaGroup = null;
			parentIndent = indent;
		}

		let lineParent = parent;

		for (let idx = 0; idx < parseRules.length; idx++) {
			const rule = parseRules[idx];
			const match = line.trim().match(rule.regexp);

			if (match !== null) {
				let token = rule.exec({
					match,
					parent: lineParent,
				});

				if (token === null) {
					prev = getSysToken('#NULL', lineParent);
				} else {
					let {target} = token;

					Object.defineProperty(token, 'description', {
						enumerable: false,
						value: {
							full: line.trim(),
							part: match[0],
						},
					});

					if (metaGroup !== null) {
						token = Object.assign({}, metaGroup, token);
						token.target = target || token.target;
						console.log('APPLY META_GROUP', token);
					}

					if (token.ctx === 'META_GROUP') {
						metaGroup = token;
						prev = getSysToken('#NULL', lineParent);
					} else {
						if (lineParent === null) {
							root.push(token);
						} else {
							token.parent = lineParent;
							!lineParent.nested && (lineParent.nested = []);
							lineParent.nested.push(token);
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
						} else if (lineParent) {
							token.target = lineParent.target;
						} else if (token.defaultTarget) {
							token.target = token.defaultTarget;
						} else if (token.target !== null) {
							throw new Error(`Unrecognized target for token: ${JSON.stringify(token)}`);
						}

						if (token.target.includes('&')) {
							token.target = token.target.replace('&', lineParent ? lineParent.target : '');
						}

						delete token.defaultTarget;
						prev = token;
					}
				}

				line = line.substr(match[0].length + indent).trim();
				indent = 0;
				!inLine && (parent = prev);
				lineParent = prev;

				if (line === '') {
					return;
				} else {
					idx = 0;
					inLine++;
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

	verbose('[parse] ', chain);

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
			.replace(/(\s*)\(target\)/g, '(?:$1"([^"]+)")')
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


function getSysToken(type, parent) {
	const token = {
		type: type,
		parent,
	};

	if (parent !== null) {
		!parent.nested && (parent.nested = []);
		parent.nested.push(token);
	}

	return token;
}