import {YodaForce} from "./force";

// const force = new YodaForce({
// 	browser: {

// 	} as any,
// 	context: {
// 		'page': {
// 			'Контакты': {
// 				ctx: 'contacts-page',
// 				loc: '#contacts',
// 			},
// 		},
// 	},
// });

it.skip('force.use', () => force.use(`
Открыть страницу "Контакты"
`));