import {YodaForce} from './force';
import {Token} from '../parse/rules';
import {PuppeteerBrowser} from '../browser/puppeteer';
import {checkTokenCondition} from './actions';

const norm = (s) => s.replace(/#([^\s]+)/g, (_, id) => `[data-qa-id="${id}"]`);
const log = [];
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
			'RANDOM': 'RANDOM',

			'FooBtn': '[name="foo"]',
			'BarBtn': '[name="bar"]',
			'BazBtn': '[name="baz"]',
			'QuxBtn': '[name="qux"]',

			'E-mail': '[name="email"]',
			'Пароль': '[name="pass"]',

			'Список контактов': {
				ctx: 'contacts',
				loc: '#contact-list',
			},

			'ID Приложения': '#client-id',

			'Контактов': {
				ctx: 'contacts',
				loc: '#contacts-total',
			},

			'Выбранных контактов': {
				ctx: 'contacts',
				loc: '#contacts-selected-count',
			},

			'Список приложений|Приложений': {
				ctx: 'app-list',
				loc: '#app-list',
			},
		},

		'page': {
			'Вики': 'https://www.wikipedia.org/',

			'Контакты': {
				ctx: 'contacts-page',
				loc: '/contacts/',
			},
		},

		'contacts/**/button': {
			'Добавить': '& #add-contact',
			'Удалить': '#remove-contacts',
			'Показать все': '#show-all-contacts',
		},

		'app-list/**/*': {
			'Удалить': '& #remove',
			'Приложение': '& #app-list-item',
		},
	},
	actions: {
		'make:good': {
			'*': async (ctx) => {
				log.push({make: 'good'});
				return true
			},
		},

		'auth:login': {
			'RANDOM': async (ctx) => {
				log.push({auth: 'RANDOM'});
				return true;
			},
		},

		'while:condition': {
			'#app-list': async (ctx) => checkTokenCondition(
				ctx.token,
				await ctx.childElementCount(),
			) ? 'repeat' : false,
		},

		'remove:all': {
			'#app-list': async (ctx) => ctx.useForce(`
				Пока "Приложений" больше нуля
					Нажать "Удалить"
			`),
		},
	},
});

beforeEach(() => {
	log.length = 0;
});

afterAll(async () => {
	browser.close();
});

it('force.use: open', async () => {
	await force.use(`Открыть страницу "Вики"`);
	expect(await browser.title()).toBe('Wikipedia');
});

it('force.use: open + auth', async () => {
	await force.use(`Авторизоваться`);
	expect(log).toEqual([{auth: 'RANDOM'}]);
});

it('force.use: wait + disbaled', async () => {
	await browser.setContent(`
		<div id="root" data-qa-id="contact-list" style="display: none;">
			<button data-qa-id="add-contact">Add</button>
		</div>
		<script>setTimeout(function () { root.style.display = ''; }, 100);</script>
	`);

	await force.use(`
		Дождаться "Список контактов"
			Кнопка "Добавить" должна быть активной
	`);
});

it('force.use: if + exists (>=1)', async () => {
	await browser.setContent(`
		<div data-qa-id="contacts-selected-count">3</div>
		<button data-qa-id="remove-contacts">Remove</button>
	`);

	await force.use(`
		Если "Выбранных контактов" больше или равно 1
			Кнопка "Удалить" должна присутствовать
	`);
});

it('force.use: if + exists (<10)', async () => {
	await browser.setContent(`
		<div data-qa-id="contacts-total">5</div>
		<button data-qa-id="show-all-contacts" style="display: none">All</button>
	`);

	await force.use(`
		Если "Контактов" меньше 10
			Кнопка "Показать все" должна отсутствовать
	`);
});

it('force.use: wait app-list & remove all', async () => {
	await browser.setContent(`
		<script>
		function remove(el) {
			var item = el.parentNode;
			var list = item.parentNode;
			list.removeChild(item);
			!list.firstElementChild && (list.style.display = 'none');
		}
		</script>
		<a data-qa-id="remove">wrong ctrl</a>
		<ul data-qa-id="app-list">
			<li>1<a onclick="remove(this)" data-qa-id="remove">x</a></li>
			<li>2<a onclick="remove(this)" data-qa-id="remove">x</a></li>
			<li>3<a onclick="remove(this)" data-qa-id="remove">x</a></li>
		</ul>
	`);
	await force.use(`Если есть "Список приложений", то удалить все`);

	expect((await browser.getContent()).match(/<body>([\s\S]+)<\/body>/)[1].replace(/\n|\s{2,}/g, '').trim())
		.toBe('<a data-qa-id="remove">wrong ctrl</a><ul data-qa-id="app-list" style="display: none;"></ul>');
});

it('force.use: move focus', async () => {
	await browser.setContent(`
		<button name="foo">Foo</button>
		<button name="bar">Bar</button>
		<button name="baz">Baz</button>
		<button name="qux">Qux</button>
	`);
	await force.use(`
		Переместить фокус вперёд
			Фокус должен быть на кнопке "FooBtn"
		Переместить фокус на 3 tab
			Фокус должен быть на "QuxBtn"
		Вернуть фокус назад
			Фокус должен быть на "BazBtn"
	`);

	/* istanbul ignore next*/
	expect(await (await browser.page).evaluate(function () {
		return document.activeElement.getAttribute('name');
	})).toBe('baz');
});

it('force.use: active and click', async () => {
	await browser.setContent(`
		<script>function foo(el) { el.style.display = 'none'; }</script>
		<button name="foo" onclick="foo(this)">Foo</button>
	`);
	await force.use(`
		Кнопка "FooBtn" должна быть активна
			Нажать её
		Кнопка "FooBtn" должна исчезнуть
	`);
});

(it as any)('force.use: fill input', async () => {
	await browser.setContent(`
		<script>function validate(el, v) {el.className = v && (el.value.length < 6) && 'invalid';}</script>
		<input name="email" autofocus class="fail" onfocus="validate(this, false)" onblur="validate(this, true)"/>
		<input name="pass" class="fail" onfocus="validate(this, false)" onblur="validate(this, true)"/>
	`);
	await force.use(`
		Переместить фокус вперед
		Фокус должен быть на поле "E-mail"
			Заполняем обязательное поле "E-mail"
				> ibn@rubaxa.org
				Поле должно быть валидным
		Заполняем поле "Пароль"
			> foo
			Поле должно быть невалидным
		Переместить фокус вперед
	`);

	expect(await browser.getProperty('[name="email"]', 'value')).toBe('ibn@rubaxa.org');
	expect(await browser.getProperty('[name="pass"]', 'className')).toBe('invalid');
	expect(await browser.getProperty('[name="pass"]', 'value')).toBe('foo');
}, 5000);

it('force.use: vars', async () => {
	const id = Math.random();
	await browser.setContent(`
		<b data-qa-id="client-id">${id}</b>
		<div data-qa-id="app-list-item" data-id="${id}" style="display: none;">fail</div>
		<div data-qa-id="app-list">
			<div data-qa-id="app-list-item" data-id="${id}"></div>
		</div>
	`);
	await force.use(`
		Запоминаем "ID Приложения" как $clientId
		В "Cписке приложений" должно присуствовать "Приложение" с [data-id="$clientId"]
	`);
});

it('force.use: rules', async () => {
	await force.use(`Сделать хорошо`);
	expect(log).toEqual([{make: 'good'}]);
});