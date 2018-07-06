import {parse} from './parse';
import { verbose } from '../verbose';

const ctx = {
	'globals': {
		'RANDOM': 'RANDOM',
		'Число Х': '#number-x',

		'Cписке приложений': {
			loc: '#app-list',
			ctx: 'app-list',
		},

		'Список|Списка|Приложени[яй]': '#app-list',
		'Создать приложение': {
			loc: '#create-app',
			ctx: 'app-editor',
		},

		'Выхода нет': {
			loc: '#no-exit',
			ctx: 'noexit',
		},

		'<form/>': 'form',

		'E-mail': '[name="email"]',
		'Пароль': '[name="password"]',
		'Пустое поле': '[name="empty"]',
		'Название': '[name="title"]',

		'Сохранить': '#save',
	},

	'button': {
		'Сохранить': '#save2',
		'Конфигуратор': '#app-cfg-btn',
	},

	'var': {
		'ID Приложения': '#app-id',
	},

	'page': {
		'Настро(ек|йки)': '/app/',
	},

	'app-list': {
		'Приложение': '#app-list-item',
	},

	'app-editor/**/button': {
		'Создать': '#create',
	},

	'noexit/**/*': {
		'Точно': '[name="wtf"]',
		'Название': '[name="caption"]',
	},
};

beforeEach(() => {
	verbose.set(true);
})

it('open page', () => {
	expect(parse(`Открыть страницу "Настроек"`, ctx)).toTokens([
		{
			ctx: 'page',
			type: 'page:open',
			target: '/app/',
		},
	]);
});

it('open page + auth', () => {
	expect(parse(`
		Открыть страницу "Настроек"
		Авторизоваться
	`, ctx)).toTokens([
		{
			ctx: 'page',
			type: 'page:open',
			target: '/app/',
		},
		{
			type: 'auth:login',
			target: 'RANDOM',
		},
	]);
});

it('if exists', () => {
	expect(parse(`Если есть "Список"`, ctx)).toTokens([
		{
			type: 'if:exists',
			invert: false,
			target: '#app-list',
		},
	]);
});

it('if empty', () => {
	expect(parse(`Если "Список" пуст`, ctx)).toTokens([
		{
			type: 'if:empty',
			invert: false,
			target: '#app-list',
		},
	]);
});

it('if exists (invert)', () => {
	expect(parse(`Если нет "Списка"`, ctx)).toTokens([
		{
			type: 'if:exists',
			invert: true,
			target: '#app-list',
		},
	]);
});

it('if condition: "<"', () => {
	const tokens = parse(`Если "Число Х" меньше 10`, ctx);

	expect(tokens).toTokens([
		{
			type: 'if:condition',
			target: '#number-x',
			invert: false,
			name: '<',
			value: '10',
			nested: [{type: '#NULL'}],
		},
	]);

	expect(tokens[0].description).toEqual({
		full: 'Если "Число Х" меньше 10',
		part: 'Если "Число Х"',
	});
});

it('if condition: ">="', () => {
	expect(parse(`Если "Число Х" больше или равно 3`, ctx)).toTokens([
		{
			type: 'if:condition',
			target: '#number-x',
			invert: false,
			name: '>=',
			value: '3',
			nested: [{type: '#NULL'}],
		},
	]);
});

it('remove all with context', () => {
	expect(parse(`Если есть "Приложения", то удалить все`, ctx)).toTokens([
		{
			type: 'if:exists',
			invert: false,
			target: '#app-list',
			nested: [{
				type: 'remove:all',
				target: '#app-list',
			}],
		},
	]);
});

it('wait and dom-attr check', () => {
	expect(parse(`Ожидаем форму "Создать приложение"`, ctx)).toTokens([
		{
			ctx: 'app-editor',
			type: 'wait:exists',
			target: '#create-app',
		},
	]);

	expect(parse(`
		Ожидаем форму "Создать приложение"
			Кнопка "Создать" недолжна быть активной
	`, ctx)).toTokens([
		{
			ctx: 'app-editor',
			type: 'wait:exists',
			target: '#create-app',
			nested: [
				{
					ctx: 'button',
					type: 'dom:property',
					target: '#create',
					name: 'disabled',
					state: true,
				},
			],
		},
	]);
});

it('form check without context', () => {
	expect(parse(`
		Проверяем форму
			- E-mail: foo@bar.ru
			- Пароль: qux
			- Пустое поле:
	`, ctx)).toTokens([
		{
			ctx: 'form',
			type: 'form:check',
			target: 'form',
			nested: [
				{
					type: 'value:check',
					target: '[name="email"]',
					expected: 'foo@bar.ru',
				},
				{
					type: 'value:check',
					target: '[name="password"]',
					expected: 'qux',
				},
				{
					type: 'value:check',
					target: '[name="empty"]',
					expected: '',
				},
			],
		},
	]);
});

it('form check with target', () => {
	expect(parse(`
		Проверяем форму "Выхода нет"
			- Точно: да
	`, ctx)).toTokens([
		{
			ctx: 'noexit',
			type: 'form:check',
			target: '#no-exit',
			nested: [
				{
					type: 'value:check',
					target: '[name="wtf"]',
					expected: 'да',
				},
			],
		},
	]);
});

it('form check with context', () => {
	expect(parse(`
		Ожидаем форму "Выхода нет"
			Проверяем форму
				- Точно: да
	`, ctx)).toTokens([
		{
			ctx: 'noexit',
			type: 'wait:exists',
			target: '#no-exit',
			nested: [
				{
					ctx: 'form',
					type: 'form:check',
					target: '#no-exit',
					nested: [
						{
							type: 'value:check',
							target: '[name="wtf"]',
							expected: 'да',
						},
					],
				},
			],
		},
	]);
});

it('focus', () => {
	expect(parse(`
		Фокус должен быть на поле "Название"
	`, ctx)).toTokens([
		{
			ctx: 'field',
			type: 'focus:check',
			target: '[name="title"]',
			invert: false,
		},
	]);
});

it('focus with context', () => {
	expect(parse(`
		Ожидаем появления формы "Выхода нет"
			Фокус должен быть на поле "Название"
	`, ctx)).toTokens([
		{
			ctx: 'noexit',
			type: 'wait:visible',
			target: '#no-exit',
			nested: [{
				ctx: 'field',
				type: 'focus:check',
				target: '[name="caption"]',
				invert: false,
			}],
		},
	]);
});

it('value set (not required)', () => {
	expect(parse(`
		Заполняем поле "E-mail"
	`, ctx)).toTokens([
		{
			type: 'value:set',
			target: '[name="email"]',
			required: false,
			value: '',
		},
	]);
});

it('value set (required)', () => {
	expect(parse(`
		Заполняем обязательное поле "E-mail"
			> Foo
	`, ctx)).toTokens([
		{
			type: 'value:set',
			target: '[name="email"]',
			required: true,
			value: 'Foo',
			nested: [{type: '#NULL'}],
		},
	]);
});

it('wait visible', () => {
	expect(parse(`
		Должна отобразиться форма "Выхода нет"
	`, ctx)).toTokens([
		{
			ctx: 'noexit',
			invert: false,
			type: 'wait:visible',
			target: '#no-exit',
		},
	]);
});

it('var inline set', () => {
	expect(parse(`
		Запоминаем "ID Приложения" как $clientId
	`, ctx)).toTokens([
		{
			type: 'var:set',
			target: '#app-id',
			name: 'clientId',
		},
	]);
});

it('wait element', () => {
	expect(parse(`
		Кнопка "Конфигуратор" должен присутсвовать
	`, ctx)).toTokens([
		{
			ctx: 'button',
			type: 'wait:exists',
			target: '#app-cfg-btn',
			invert: false,
		},
	]);
});

it('click to save', () => {
	expect(parse(`
		Нажимаем "Сохранить"
	`, ctx)).toTokens([
		{
			ctx: null,
			type: 'click',
			target: '#save',
		},
	]);

	expect(parse(`
		Нажимаем на "Сохранить"
	`, ctx)).toTokens([
		{
			ctx: null,
			type: 'click',
			target: '#save',
		},
	]);

	expect(parse(`
		Нажимаем на кнопку "Сохранить"
	`, ctx)).toTokens([
		{
			ctx: 'button',
			type: 'click',
			target: '#save2',
		},
	]);
});

it('group', () => {
	expect(parse(`
		Проверяем созданое приложение
	`, ctx)).toTokens([
		{
			type: 'group',
			name: 'Проверяем созданое приложение',
			target: null,
		},
	]);
});

it('exists with context (inline)', () => {
	expect(parse(`
		В "Cписке приложений" должно присуствовать "Приложение" с [data-id="$clientId"]
	`, ctx)).toTokens([
		{
			ctx: 'app-list',
			type: 'wait:exists',
			target: '#app-list',
			nested: [{
				ctx: null,
				type: 'wait:visible',
				target: '#app-list-item[data-id="$clientId"]',
				invert: false,
				nested: [{type: '#NULL'}],
			}],
		},
	]);
});

it('while visible', () => {
	expect(parse(`Пока есть "Приложения"`, ctx)).toTokens([
		{
			type: 'while:visible',
			target: '#app-list',
			invert: false,
		},
	]);

	expect(parse(`Пока нет "Приложений"`, ctx)).toTokens([
		{
			type: 'while:visible',
			target: '#app-list',
			invert: true,
		},
	]);

	expect(parse(`Пока "Приложений" больше нуля`, ctx)).toTokens([
		{
			type: 'while:condition',
			target: '#app-list',
			invert: false,
			name: '>',
			value: 0,
		},
	]);
});

it('focus move', () => {
	expect(parse(`Смещаем фокус на 3 tab`, ctx)).toTokens([
		{
			type: 'focus:move',
			value: '3',
			target: null,
			invert: false,
		},
	]);

	expect(parse(`Возвращаем фокус назад`, ctx)).toTokens([
		{
			type: 'focus:move',
			invert: true,
			value: '1',
			target: null,
		},
	]);

	expect(parse(`Перемещаем фокус вперед`, ctx)).toTokens([
		{
			type: 'focus:move',
			invert: false,
			value: '1',
			target: null,
		},
	]);
});

it('focus check', () => {
	expect(parse(`Фокус должен быть на "E-mail"`, ctx)).toTokens([
		{
			type: 'focus:check',
			target: '[name="email"]',
			invert: false,
		},
	]);

	expect(parse(`Фокус недолжен быть на поле "E-mail"`, ctx)).toTokens([
		{
			type: 'focus:check',
			target: '[name="email"]',
			invert: true,
		},
	]);
});
