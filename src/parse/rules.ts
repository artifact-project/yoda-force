export type Token = {
	ctx?: string;
	type: string;
	invert?: boolean;
	parent?: Token;
	target?: string;
	defaultTarget?: string;
	name?: string;
	state?: boolean;
	expected?: string;
	value?: string;
	required?: boolean;
	nested?: Token[];
}

export type Rules = {
	[pattern: string]: (data: {match: string[], parent?: Token}) => Token | null;
}

export default <Rules>{
	'Открыть страницу (target)': ({match}): Token => ({
		type: 'page:open',
		target: match[1],
	}),

	'Если(?: (есть|нету?))? (target)(?:, (то|тогда))?': ({match}): Token => ({
		type: 'if:exists',
		invert: match[1] !== 'есть',
		target: match[2],
	}),

	'Если {target} отсуствует(?:, (то|тогда))?': ({match}): Token => ({
		type: 'if:exists',
		invert: true,
		target: match[1],
	}),

	'Удалить вс[её] (target)?': ({match}): Token => ({
		type: 'remove:all',
		target: match[1],
	}),

	'Ожидаем(?: (появления|отображения|добавления))? (?:[а-я]+) (target)': ({match}): Token => ({
		type: match[1] === 'появления' ? 'wait:visible' : 'wait:exists',
		target: match[2],
	}),

	'Должн[ао]? (отобразиться|появиться|присуствовать|отсуствовать)(?: [а-я]+)? (target)': ({match}): Token => ({
		type: 'wait:visible',
		target: match[2],
		invert: match[1] === 'отсуствовать',
	}),

	'Кнопка (target) (не)?должна быть (не)?активн(ой|а)': ({match}): Token => ({
		ctx: 'button',
		type: 'dom:property',
		target: match[1],
		name: 'disabled',
		state: match[2] === 'не' || match[2] === 'не',
	}),

	'Провер(?:ить|яем|ка) форм(?:у|ы) (target)?': ({match}): Token => ({
		ctx: 'form',
		type: 'form:check',
		target: match[1],
		defaultTarget: 'form',
	}),

	' - ([^:]+):(.*)': ({match}): Token => ({
		type: 'value:check',
		target: match[1].trim(),
		expected: match[2].trim(),
	}),

	'Фокус должен быть на(?: поле)? (target)': ({match}): Token => ({
		type: 'focus:check',
		target: match[1],
	}),

	'Заполн(?:яем|ить)(?: это)?( (?:не)?обязательное)?(?: поле)? (target)?': ({match}): Token => ({
		type: 'value:set',
		target: match[2],
		required: match[1] ? match[1].trim() === 'обязательное' : false,
		value: '',
	}),

	' >(.*?)$': ({match, parent}): null => {
		if (parent.value !== '') {
			parent.value += '\n';
		}
		parent.value += match[1].trim();
		return null;
	},

	'Запоминаем (target) как (target)': ({match}): Token => ({
		type: 'var:set',
		target: match[1],
		name: match[2],
	}),

	'(Кнопка|Форма|Элемент) (target) должен[аы]? (при|от)сутсвовать': ({match}): Token => ({
		ctx: match[1] === 'Кнопка' ? 'button' : null,
		type: 'wait:exists',
		target: match[2],
		invert: match[3] === 'от',
	}),

	'Нажимаем(?: на(?: ([а-я]+))?)? (target)': ({match}): Token => ({
		ctx: match[1] === 'кнопку' ? 'button' : null,
		type: 'click',
		target: match[2],
	}),

	'Проверяем(?: [а-я]+)+': ({match}): Token => ({
		type: 'group',
		name: match[0],
	}),

	'В (target)': ({match}): Token => ({
		type: 'wait:exists',
		target: match[1],
	}),

	'с (\\[.*?\\])': ({match, parent}): null => {
		parent.target += match[1];
		return null;
	},

	'(не)?пуст(ой)?(,|$)': ({match, parent}): null => {
		parent.type = `${parent.type.split(':')[0]}:empty`;
		parent.invert = match[1] === 'не';
		return null;
	},
};