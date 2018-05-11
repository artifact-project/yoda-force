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

const IF_COND_MAP = {
	'меньше': '<',
	'больше': '>',
	'равно': '=',
};

const RU_NUMBERS = {
	'нуля': 0,
	'одного': 1,
	'двух': 2,
	'трех': 3,
};

export default <Rules>{
	'Авторизоваться(?: как (target))?': ({match}): Token => ({
		type: 'auth:login',
		target: match[1] || 'RANDOM',
	}),

	'Открыть страницу (target)': ({match}): Token => ({
		type: 'page:open',
		target: match[1],
	}),

	'Если(?: (есть|нету?))? (target)(?:, (то|тогда))?': ({match}): Token => ({
		type: 'if:exists',
		invert: match[1] ? match[1] !== 'есть' : false,
		target: match[2],
	}),

	'Если {target} отсуствует(?:, (то|тогда))?': ({match}): Token => ({
		type: 'if:exists',
		invert: true,
		target: match[1],
	}),

	[`(меньше|больше|равно|<=|>=)( или равно)? (\\d+|${Object.keys(RU_NUMBERS).join('|')})`]: ({match, parent}): null => {
		parent.type = `${parent.type.split(':')[0]}:condition`;
		parent.name = (IF_COND_MAP[match[1]] || match[1]) + (match[2] ? '=' : '');
		parent.value = RU_NUMBERS.hasOwnProperty(match[3]) ? RU_NUMBERS[match[3]] : match[3];
		return null;
	},

	'Пока(?: (есть|присутствует|нету?|отсутствует))? (target)': ({match}): Token => ({
		type: 'while:visible',
		invert: match[1] != null  && match[1] !== 'есть' && match[1] !== 'присутствует',
		target: match[2],
	}),

	'Удалить вс[её] (target)?': ({match}): Token => ({
		type: 'remove:all',
		target: match[1],
	}),

	'Ожидаем(?: (появления|отображения|добавления))? (?:[а-я]+) (target)': ({match}): Token => ({
		type: match[1] === 'появления' ? 'wait:visible' : 'wait:exists',
		target: match[2],
	}),

	'Дожда(?:ться|емся)(?: появления|отображения)? (target)': ({match}): Token => ({
		type: 'wait:visible',
		target: match[1],
	}),

	'Должн[ао]? (отобразиться|появиться|присуствовать|отсуствовать)(?: [а-я]+)? (target)': ({match}): Token => ({
		type: 'wait:visible',
		target: match[2],
		invert: match[1] === 'отсуствовать',
	}),

	'Кнопка (target) (не)?должна (отсутствовать|присутствовать|исчезнуть|появиться)': ({match}): Token => ({
		ctx: 'button',
		type: 'wait:visible',
		target: match[1],
		invert: !!(+(match[3] === 'отсутствовать' || match[3] === 'исчезнуть') ^ +(match[2] === 'не')),
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

	'Заполн(?:яем|ить)(?: это)?( (?:не)?обязательное)?(?: поле)? (target)?': ({match}): Token => ({
		type: 'value:set',
		target: match[2],
		required: match[1] ? match[1].trim() === 'обязательное' : false,
		value: '',
	}),

	'Поле (target)? (не)?должно быть (не)?валидным': ({match}): Token => ({
		type: 'value:validate',
		target: match[1],
		invert: !!(+(match[2] === 'не') ^ +(match[3] === 'не')),
	}),

	' >(.*?)$': ({match, parent}): null => {
		if (parent.value !== '') {
			parent.value += '\n';
		}
		parent.value += match[1].trim();
		return null;
	},

	'(?:Запоминаем|Запоминить) (target) как \\$([^\\s]+)': ({match}): Token => ({
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

	'(?:Нажимаем|Нажать|Кликнуть)(?: на(?: ([а-я]+))?)? (target)': ({match}): Token => ({
		ctx: match[1] === 'кнопку' ? 'button' : null,
		type: 'click',
		target: match[2],
	}),

	'(?:Нажимаем|Нажать|Кликнуть) е[её]': ({match}): Token => ({
		type: 'click',
	}),

	'(?:Смещаем|Перемещаем|Возвращаем|Переместить|Вернуть) фокус(?: (назад|назад|впер[ёе]д))?(?: на (\\d+) tab)?(?: (назад|впер[ёе]д))?': ({match}): Token => ({
		type: 'focus:move',
		invert: match[1] === 'назад' || match[3] === 'назад',
		value: match[2] || '1',
		target: null,
	}),

	'Фокус (не)?должен быть на(?: [\\wа-яё]+)? (target)': ({match}): Token => ({
		type: 'focus:check',
		target: match[2],
		invert: match[1] === 'не',
	}),

	'Проверяем(?: [а-я]+)+': ({match}): Token => ({
		type: 'group',
		name: match[0],
		target: null,
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