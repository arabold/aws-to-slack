/* global expect, test */
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
				"EventSource": "aws:sns",
				"EventVersion": "1.0",
				"EventSubscriptionArn": "arn:aws:sns:region:9999999991:ExampleTopic:ExampleSubscriptionId",
				"Sns": {
					"Type": "Notification",
					"TopicArn": "arn:aws:sns:region:9999999991:ExampleTopic",
					"SignatureVersion": "1",
					"Timestamp": `1970-0${rand(1)}-2${rand(1)}T0${rand(1)}:0${rand(1)}:0${rand(1)}.${rand(3)}Z`,
					"Signature": "http://example.com/signature",
					"SigningCertUrl": "http://example.com/signingcerturl",
					"UnsubscribeUrl": "http://example.com/unsubscribeurl",
					"Subject": "TestInvoke",
					"MessageId": `95df01b4-ee${rand(2)}-5cb9-9903-4c221d41${rand(4)}`,
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
				},
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
			const msg = await this.makeNew().parse(event);
			expect(msg).toEqual(expect.objectContaining({
				attachments: [expect.any(Object)],
			}));
			expect(msg.attachments).toHaveLength(1);
		});

		test(`Parser[${this.name}] is selected by Lambda handler`, async () => {
			const msg = await this.makeNew().parse(event);
			const h = await Handler.processEvent(event);
			expect(h.name).toEqual(this.name);
			expect(h.slackMessage).toEqual(expect.objectContaining(msg));
		});
	}
}

module.exports = ParserMock;