import {YodaForce} from './force';
import {Token} from '../parse/rules';
import {PuppeteerBrowser} from '../browser/puppeteer';
import {checkTokenCondition} from './actions';
import {PageContext} from './context';
import {readFileSync} from 'fs';

const MOCK_TPL = `${__dirname}/force.app.mock.html`;

const browser = new PuppeteerBrowser({timeout: 1000});

const force = new YodaForce({
	browser,
	validateInput: async (ctx, s) => {
		const invalid = /invalid/.test(await ctx.getDOMPropertyValue('className'));
		return s === 'invalid' && invalid || s === 'valid' && !invalid;
	},
	rules: {
		'Сделать хорошо': (): Token => ({
			type: 'make:good',
			target: null,
		}),
	},
	context: {
		'globals': {
			'Списо?ке? цветов': {
				ctx: 'color-list',
				loc: '#not-empty-list #list',
			},
		},

		'page': {
			'Палитра': '/app/',
		},

		'button': {
			'Добавить первый цвет': '#add-first-color',
			'Добавить цвет': '#add-color',
		},

		'color-list': {
			'Удалить': '& #remove',
		},

		'form': {
			'Новый цвет': {
				ctx: 'color-form',
				loc: '#add-form'
			},
		},

		'color-form/button': {
			'Добавить': '& #add',
		},

		'color-form/field': {
			'Название': '& [name="name"]',
			'Значение': '& [name="value"]',
		},
	},
	actions: {
		'page:open': {
			'/app/': () => browser.setContent(readFileSync(MOCK_TPL) + ''),
		},

		'remove:all': {
			'#not-empty-list #list': () => force.use(`
				Пока есть "Список цветов"
					Нажать "Удалить"
			`),
		},
	},
});

it('app-color', async () => await force.use(`
	Открыть страницу "Палитра"
	Если "Список цветов" не пуст, то удалить все

	"Список цветов" должен отсуствовать
	На экране должна быть кнопка "Добавить первый цвет"
		Нажимаем её

	Должна появиться форма "Новый цвет"
		Кнопка "Добавить" должна быть disabled

		Фокус должен быть на поле "Название"
			Это поле должно быть обязательным
			Заполняем его
				> Black

		Перемещаем фокус на 1 таб вперед
		Фокус должен переместиться на поле "Значение"
			Заполняем это обязательное поле
				> #f00

		Кнопка "Добавить" должна стать активной
			Нажимаем её

	Должны исчезнуть:
		+ Форма "Новый цвет"
		+ Кнопка "Добавить первый цвет"

	Должны появиться:
		+ Кнопка "Добавить цвет"
		+ Блок "Список цветов"

	В "Списке цветов" должен присуствовать элемент с [data-id="Black"]
`));