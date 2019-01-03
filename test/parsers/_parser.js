/* global expect */

const libBase = "../../src"
	, Handler = require(`${libBase}/index`);

function matchesEvent (type, event) {
	const parser = require(`${libBase}/${type}`);

	test(`${type}: type exists`, () => {
		expect(parser instanceof Function).toBeTruthy();
		expect(parser.prototype)
			.toEqual(expect.objectContaining({ parse: expect.any(Function) }));
	});

	test(`${type}: parser will match event`, async () => {
		const result = await (new parser()).parse(event);
		expect(result).toEqual(expect.objectContaining({
			attachments: [expect.any(Object)],
		}));
		expect(result.attachments).toHaveLength(1);
	});

	test(`${type}: parser is selected by event-handler`, async () => {
		const result = await (new parser()).parse(event);
		const h = await Handler.processEvent(event);
		expect(h).toEqual(expect.objectContaining(result));
	});
}

module.exports.matchesEvent = matchesEvent;
