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

	makeNew() {
		const parser = require(`../../src/parsers/${this.name}`);
		return new parser();
	}

	matchesEvent(event) {
		test(`Parser[${this.name}] exists`, () => {
			const parser = require(`../../src/parsers/${this.name}`);
			expect(parser).toEqual(expect.any(Function));
			expect(parser.prototype)
				.toEqual(expect.objectContaining({ parse: expect.any(Function) }));
		});

		test(`Parser[${this.name}] will match event`, async () => {
			const result = await this.makeNew().parse(event);
			expect(result).toEqual(expect.objectContaining({
				attachments: [expect.any(Object)],
			}));
			expect(result.attachments).toHaveLength(1);
		});

		test(`Parser[${this.name}] is selected by Lambda handler`, async () => {
			const result = await this.makeNew().parse(event);
			const h = await Handler.processEvent(event);
			expect(h).toEqual(expect.objectContaining(result));
		});
	}
}

module.exports = ParserMock;
