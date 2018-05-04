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
	},
	actions: {
		'if:exists': {
			'#contacts': ({ctx}) => ctx.hasChildren(),
		},

		'if:empty': {
			'#contacts': ({ctx}) => ctx.hasChildren(),
		},

		'remove:all': {
			'#contacts': ({ctx}) => {
				while (ctx.has('#edit')) {
					ctx.click('#edit');
					ctx.page.wait('#editor');
					ctx.page.click('#remove');
					ctx.wait();
				}
			}
		},
	},
});

beforeEach(() => force.use(`
	Авторизоваться
	Открыть страницу "Мои контакты"
`);
});

it(() => force.use(`
Если "Список контактов" непустой, то удалить все
`));
```


### Development

 - `npm i`
 - `npm test`, [code coverage](./coverage/lcov-report/index.html)
