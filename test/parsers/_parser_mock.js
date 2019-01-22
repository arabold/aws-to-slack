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

	/**
	 * Convert an SNS payload into a root event object.
	 *
	 * @param {string|{}} message Object or string message payload
	 * @param {string} [subject] SNS message subject
	 * @returns {{}} Translated event object
	 */
	static snsMessageToEvent(message, subject) {
		if (typeof message !== "string") {
			message = JSON.stringify(message);
		}
		function rand(digits) {
			return String(Math.random() * 100000000).substr(0, digits);
		}
		return {
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
					"Subject": subject || "TestInvoke",
					"MessageId": `95df01b4-ee${rand(2)}-5cb9-9903-4c221d41${rand(4)}`,
					"Message": message,
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
	}

	constructor(name) {
		this.name = name;
	}

	/**
	 * Create a new Parser instance.
	 *
	 * @returns {*} Parser instance
	 */
	makeNew() {
		const parser = require(`../../src/parsers/${this.name}`);
		return new parser();
	}

	/**
	 * Confirm that this parser will match the provided SNS message.
	 *
	 * @param {string|{}} message Object or string message payload
	 * @param {string} [subject] SNS message subject
	 * @returns {ParserMock} Returns self for chain-able stacks
	 */
	matchesSNS(message, subject) {
		this.matchesEvent(ParserMock.snsMessageToEvent(message, subject));
		return this;
	}

	/**
	 * Confirm that this parser will match the provided raw event.
	 *
	 * @param {string|{}} event Object or string payload
	 * @returns {ParserMock} Returns self for chain-able stacks
	 */
	matchesEvent(event) {
		// .parse() method takes object, not string
		if (typeof event === "string") {
			event = JSON.parse(event);
		}

		describe(`Parser-Mock: ${this.name}`, () => {
			test("parser exists", () => {
				const parser = require(`../../src/parsers/${this.name}`);
				expect(parser).toEqual(expect.any(Function));
				expect(parser.prototype)
					.toEqual(expect.objectContaining({ parse: expect.any(Function) }));
			});

			test("parser will match event", async () => {
				const msg = await this.makeNew().parse(event);
				expect(msg).toBeTruthy();
				// Confirm basic response structure
				//TODO: this is pretty restrictive, what if parsers create fancy events?
				expect(msg).toEqual(expect.objectContaining({
					attachments: [expect.any(Object)],
				}));
				//TODO: this is a bad assumption -- there's no limit on number of attachments
				expect(msg.attachments).toHaveLength(1);
			});

			test("parser is selected by Lambda handler", async () => {
				const msg = await this.makeNew().parse(event);
				const h = await Handler.processEvent(event);
				expect(h).toEqual(expect.objectContaining({
					name: this.name,
					slackMessage: expect.any(Object),
				}));
				expect(h.name).toEqual(this.name);
				expect(h.slackMessage).toEqual(expect.objectContaining(msg));
			});
		});

		return this;
	}
}

module.exports = ParserMock;
