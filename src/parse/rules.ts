import { verbose } from "../verbose";

export type Token = {
	ctx?: string;
	type: string;
	description?: {
		full: string;
		part: string;
	};
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

const RU_CONTEXT_HELPER = [
	['страниц[ауы]', 'page'],
	['форм[ауы]', 'form'],
	['кнопк[ау]', 'button'],
	['блок[а]?', 'block'],
	['поле', 'field'],
].reduce((list, [pattern, name]) => {
	const re = new RegExp(`^${pattern}$`, 'i');
	list.push({
		test: (v) => re.test(v),
		name,
	});
	return list;
}, [] as Array<{test:(v) => boolean, name: string}>);

function detectContext(v, d?): string | null {
	const ctx = v && RU_CONTEXT_HELPER.find(({test}) => test(v));
	d && verbose('[detectContext]', v, d, ctx);
	return ctx ? ctx.name : null;
}

export default <Rules>{
	'Авторизоваться(?: как (target))?': ({match}): Token => ({
		type: 'auth:login',
		target: match[1] || 'RANDOM',
	}),

	'Открыть(?: страницу) (target)': ({match}): Token => ({
		ctx: 'page',
		type: 'page:open',
		target: match[1],
	}),

	'Если (target)(?: (не))? пуст(?:, (то|тогда))?': ({match}): Token => ({
		type: 'if:empty',
		invert: match[2] == 'не',
		target: match[1],
	}),

	'Если(?: (есть|нету?))? (target)(?:, (то|тогда))?': ({match}): Token => ({
		type: 'if:exists',
		invert: match[1] ? match[1] !== 'есть' : false,
		target: match[2],
	}),

	'Если (target) отсуствует(?:, (то|тогда))?': ({match}): Token => ({
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

	'Должн[ао]? (отобразиться|появиться|присуствовать|отсуствовать)(?: ([а-я]+))? (target)': ({match}): Token => ({
		ctx: detectContext(match[2]),
		type: 'wait:visible',
		target: match[3],
		invert: match[1] === 'отсуствовать',
	}),

	'(?:На экране) (не)?должна быть (кнопка|форма|блок) (target)': ({match}): Token => ({
		ctx: detectContext(match[2]),
		type: 'wait:visible',
		target: match[3],
		invert: match[1] === 'не',
	}),

	'(?:(Кнопка|Форма) )?(target) (не)?(?:должна|должен) (отсуствовать|присутствовать|исчезнуть|появиться)': ({match}): Token => ({
		ctx: detectContext(match[1]),
		type: 'wait:visible',
		target: match[2],
		invert: !!(+(match[4] === 'отсуствовать' || match[4] === 'исчезнуть') ^ +(match[3] === 'не')),
	}),

	'Кнопка (target) (не)?должна (?:быть|стать) (не)?активн(ой|а)': ({match}): Token => ({
		ctx: 'button',
		type: 'dom:property',
		target: match[1],
		name: 'disabled',
		state: match[2] === 'не' || match[3] === 'не',
	}),

	'Кнопка (target) (не)?должна быть disabled': ({match}): Token => ({
		ctx: 'button',
		type: 'dom:property',
		target: match[1],
		name: 'disabled',
		state: match[2] !== 'не',
	}),

	'Провер(?:ить|яем|ка) форм(?:у|ы) (target)?': ({match}): Token => ({
		ctx: 'form',
		type: 'form:check',
		target: match[1],
		defaultTarget: 'form',
	}),

	'\\+(?: (Кнопка|Форма|Поле|Блок|Лаер) )?(target)': ({match}): Token => ({
		type: null,
		ctx: detectContext(match[1]),
		target: match[2].trim(),
	}),

	' - ([^:]+):(.*)': ({match}): Token => ({
		type: 'value:check',
		target: match[1].trim(),
		expected: match[2].trim(),
	}),

	'(?:Это )?поле (target)? (не)?должно быть (не)?обязательным': ({match}): Token => ({
		ctx: 'field',
		target: match[1],
		type: 'value:required',
		required: !notNot(match[2], match[3]),
	}),

	'Заполн(?:яем|ить)(?: (?:это|его))?( (?:не)?обязательное)?(?: поле)? (target)?': ({match}): Token => ({
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

	'(Не)?должны (исчезнуть|появиться):?': ({match}): Token => ({
		ctx: 'META_GROUP',
		type: 'wait:visible',
		invert: notNot(match[1], match[2] === 'исчезнуть'),
	}),

	'(Кнопка|Форма|Элемент) (target) должен[аы]? (при|от)сутсвовать': ({match}): Token => ({
		ctx: detectContext(match[1]),
		type: 'wait:exists',
		target: match[2],
		invert: match[3] === 'от',
	}),

	'(?:Нажимаем|Нажать|Кликнуть)(?: на(?: ([а-я]+))?)? (target)': ({match}): Token => ({
		ctx: detectContext(match[1]),
		type: 'click',
		target: match[2],
	}),

	'(?:Нажимаем|Нажать|Кликнуть) е[её]': ({match}): Token => ({
		type: 'click',
	}),

	'(?:Смещаем|Перемещаем|Возвращаем|Переместить|Вернуть) фокус(?: (назад|назад|впер[ёе]д))?(?: на (\\d+) (?:tab|таб))?(?: (назад|впер[ёе]д))?': ({match}): Token => ({
		type: 'focus:move',
		invert: match[1] === 'назад' || match[3] === 'назад',
		value: match[2] || '1',
		target: null,
	}),

	'Фокус (не)?должен(?: (?:переместиться|быть))? на(?: ([\\wа-яё]+))? (target)': ({match}): Token => ({
		ctx: detectContext(match[2] || 'поле'),
		type: 'focus:check',
		target: match[3],
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

	// with attr
	'((не)?должено? (?:присутствовать|быть)(?: элемент)? )?с (\\[.*?\\])': ({match, parent}): null => {
		parent.invert = !!match[2] || parent.invert;
		parent.target += `${match[1] ? ' ' : ''}${match[3]}`;
		return null;
	},

	'(не)?пуст(ой)?(,|$)': ({match, parent}): null => {
		parent.type = `${parent.type.split(':')[0]}:empty`;
		parent.invert = match[1] === 'не';
		return null;
	},
};


function notNot(a: string | boolean, b: string | boolean) {
	return !!(+(a === 'не' || a) ^ +(b === 'не' || b));
}