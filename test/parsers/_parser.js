/* global expect */

const Handler = require("../../src/index");

/**
 * Helper class for creating tests around event parsing.
 */
class ParserMock {

	static named(name) {
		return new ParserMock(name);
	}

	constructor(name) {
		this.name = name;
	}

	matchesEvent(event) {
		const type = this.name;
		const parser = require(`../../src/parsers/${type}`);

		test(`Parser[${type}] exists`, () => {
			expect(parser).toEqual(expect.any(Function));
			expect(parser.prototype)
				.toEqual(expect.objectContaining({ parse: expect.any(Function) }));
		});

		test(`Parser[${type}] will match event`, async () => {
			const result = await (new parser()).parse(event);
			expect(result).toEqual(expect.objectContaining({
				attachments: [expect.any(Object)],
			}));
			expect(result.attachments).toHaveLength(1);
		});

		test(`Parser[${type}] is selected by Lambda handler`, async () => {
			const result = await (new parser()).parse(event);
			const h = await Handler.processEvent(event);
			expect(h).toEqual(expect.objectContaining(result));
		});
	}
}

module.exports = ParserMock;
