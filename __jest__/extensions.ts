import * as diff from 'jest-diff';
import {Token} from '../src/parse/rules';

function clean(tokens: Token[] | Token) {
	if (Array.isArray(tokens)) {
		return tokens.map(clean);
	} else {
		const copy = Object.keys(tokens).sort().reduce((map, key) => {
			map[key] = tokens[key];
			return map;
		}, {} as Token);

		if (copy.nested) {
			copy.nested = clean(copy.nested);
		}

		delete copy.parent;

		return copy;
	}
}

function toTokens(this: jest.MatcherUtils, received: Token[], argument: Token[]) {
	const actual = clean(received);
	const expected = clean(argument);

	const diffString = diff(expected, actual, {});
	const pass = JSON.stringify(actual) === JSON.stringify(expected);

    const message = pass
		? () => this.utils.matcherHint('.not.toTokens') +
			'\n\n' +
			`Expected value to not equal:\n` +
			`  ${this.utils.printExpected(expected)}\n` +
			`Received:\n` +
			`  ${this.utils.printReceived(received)}`
		: () => (
			this.utils.matcherHint('.toTokens') +
			'\n\n' +
			`Expected value to be equal:\n` +
			`  ${this.utils.printExpected(expected)}\n` +
			`Received:\n` +
			`  ${this.utils.printReceived(received)}` +
			(diffString ? `\n\nDifference:\n\n${diffString}` : '')
);

    return {actual: received, message, pass};
}

expect.extend({
	toTokens,
});
