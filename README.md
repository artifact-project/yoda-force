Yoda Force
----------
BDD test runner for UI testing.


### Usage

```ts
import YodaForce from 'yoda-force'

const force = new YodaForce({
	domIdAttr: 'data-test-id',
	context: {
		'globals': {
			'Список контактов': {ctx: 'contacts', loc: '#contacts'},
		},
		'while': {
			'Контактов': '#contacts-count',
		},
		'contacts/**/*': {
			'Удалить': '#contacts #remove',
		},
	},
	actions: {
		'remove:all': {
			'#contacts': async (ctx) => ctx.useForce(`
				Пока "Контактов" больше нуля
					Нажать "Удалить"
			`),
		},
	},
});

beforeEach(async () => await force.use(`
	Авторизоваться
	Открыть страницу "Мои контакты"
`));

it(async () => await force.use(`
	Если есть "Список контанктов", то удалить все
`));
```

---

### Development

 - `npm i`
 - `npm test`, [code coverage](./coverage/lcov-report/index.html)
