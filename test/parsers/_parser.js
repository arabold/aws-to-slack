/* global expect */
/* eslint lodash/prefer-lodash-typecheck:0 */

const Handler = require("../../src/index");

/**
 * Helper class for creating tests around event parsing.
 */
class ParserMock {

	/**
	 * Created instance for chainable calls.
	 *
	 * @param {string} name Name of file within parsers/ namespace
	 * @returns {ParserMock} newly-created instance
	 */
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

	matchesSNS(event) {
		if (typeof event !== "string") {
			event = JSON.stringify(event);
		}
		function rand(digits) {
			return String(Math.random() * 100000000).substr(0, digits);
		}
		event = {
			Records: [{
				"EventVersion": "1.0",
				"EventSubscriptionArn": "arn:aws:sns:region:9999999991:topicname:subscriptionid",
				"EventSource": "aws:sns",
				"Sns": {
					"SignatureVersion": "1",
					"Timestamp": `1970-0${rand(1)}-2${rand(1)}T0${rand(1)}:0${rand(1)}:0${rand(1)}.${rand(3)}Z`,
					"Signature": "EXAMPLE",
					"SigningCertUrl": "EXAMPLE",
					"MessageId": "95df01b4-ee98-5cb9-9903-4c221d41eb5e",
					"Message": event,
					"MessageAttributes": {
						"Test": {
							"Type": "String",
							"Value": "TestString"
						},
						"TestBinary": {
							"Type": "Binary",
							"Value": "TestBinary"
						}
					},
					"Type": "Notification",
					"UnsubscribeUrl": "EXAMPLE",
					"TopicArn": "arn:aws:sns:region:9999999991:topicname",
					"Subject": "TestInvoke"
				}
			}]
		};

		return this.matchesEvent(event);
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
