/* global expect, test, jest */
/* eslint lodash/prefer-lodash-typecheck:0 lodash/prefer-lodash-method:0 */

const Handler = require("../../src/index")
	, EventDef = require("../../src/eventdef");

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
		parser.name = this.name;
		return parser;
	}

	/**
	 * Confirm parser will match the provided raw event.
	 *
	 * @param {{}} event Object or string payload
	 * @returns {ParserMock} Returns self for chain-able stacks
	 */
	matchesEvent(event) {
		describe(`Parser-Mock: ${this.name}`, () => {
			test("parser exists", () => {
				const parser = require(`../../src/parsers/${this.name}`);
				expect(parser).toEqual(expect.objectContaining({
					parse: expect.any(Function),
					matches: expect.any(Function),
				}));
			});

			test("parser.parse() is called", async () => {
				const parser = require(`../../src/parsers/${this.name}`);
				const handle = new Handler();
				expect(handle.parsers).toContain(parser);
				const idx = handle.parsers.indexOf(parser);

				const mockMatchFn = jest.fn().mockImplementation(() => true);
				const mockParseFn = jest.fn().mockImplementation(() => false);
				const origParser = handle.parsers[idx];
				handle.parsers[idx] = Object.assign({}, origParser, {
					matches: mockMatchFn,
					parse: mockParseFn,
				});

				const eventDef = new EventDef(event);
				await handle.processEvent(eventDef);
				expect(mockMatchFn).toHaveBeenCalledTimes(1);
				expect(mockMatchFn).toHaveBeenCalledWith(eventDef);
				expect(mockParseFn).toHaveBeenCalledTimes(1);
				expect(mockParseFn).toHaveBeenCalledWith(eventDef);
			});

			test("parser will match event", async () => {
				const eventDef = new EventDef(event);
				const msg = await this.makeNew().parse(eventDef);
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
				const eventDef = new EventDef(event);
				const msg = await this.makeNew().parse(eventDef);
				const h = await new Handler().processEvent(eventDef);
				expect(h.parserName).toEqual(this.name);
				expect(h.slackMessage).toEqual(expect.objectContaining(msg));
			});
		});

		return this;
	}

	matchesEventWithDetail(event, detail) {
		describe(`Parser-Mock: ${this.name}`, () => {
			test("matches event with detail", async () => {
				const eventDef = new EventDef(event);
				const result = await this.makeNew().parse(eventDef);
				expect(result.attachments[0]).toMatchObject(detail);
			});
		});
	}

	/**
	 * Confirm parser will match the provided SNS message.
	 *
	 * @param {string|{}} message Object or string message payload
	 * @param {string} [subject] SNS message subject
	 * @returns {ParserMock} Returns self for chain-able stacks
	 */
	matchesSnsMessage(message, subject) {
		this.matchesEvent(ParserMock.snsMessageToEvent(message, subject));
		return this;
	}

	/**
	 * Confirm that this parser will NOT match the provided raw event.
	 *
	 * @param {{}} event Object or string payload
	 * @returns {ParserMock} Returns self for chain-able stacks
	 */
	doesNotMatchEvent(event) {
		describe(`Parser-Mock: ${this.name}`, () => {
			test("parser will NOT match event", async () => {
				const eventDef = new EventDef(event);
				const msg = await this.makeNew().parse(eventDef);
				expect(msg).toBeFalsy();
			});

			test("parser.parse() is called", async () => {
				const parser = require(`../../src/parsers/${this.name}`);
				const handle = new Handler();
				expect(handle.parsers).toContain(parser);
				const idx = handle.parsers.indexOf(parser);

				const mockMatchFn = jest.fn().mockImplementation(() => true);
				const mockParseFn = jest.fn().mockImplementation(() => false);
				const origParser = handle.parsers[idx];
				handle.parsers[idx] = Object.assign({}, origParser, {
					matches: mockMatchFn,
					parse: mockParseFn,
				});

				const eventDef = new EventDef(event);
				await handle.processEvent(eventDef);
				expect(mockMatchFn).toHaveBeenCalledTimes(1);
				expect(mockMatchFn).toHaveBeenCalledWith(eventDef);
				expect(mockParseFn).toHaveBeenCalledTimes(1);
				expect(mockParseFn).toHaveBeenCalledWith(eventDef);
			});

			test("parser is NOT selected by Lambda handler", async () => {
				const eventDef = new EventDef(event);
				const msg = await this.makeNew().parse(eventDef);
				const h = await new Handler().processEvent(eventDef);
				expect(h).not.toEqual(msg);
				if (h) {
					expect(h.name).not.toEqual(this.name);
				}
			});
		});

		return this;
	}

	/**
	 * Confirm parser will NOT match the provided SNS message.
	 *
	 * @param {string|{}} message Object or string message payload
	 * @param {string} [subject] SNS message subject
	 * @returns {ParserMock} Returns self for chain-able stacks
	 */
	doesNotMatchSnsMessage(message, subject) {
		this.doesNotMatchEvent(ParserMock.snsMessageToEvent(message, subject));
		return this;
	}

	/**
	 * Confirm parser will STOP handler processing when given the provided event object.
	 *
	 * @param {{}} event Object or string message payload
	 * @returns {ParserMock} Returns self for chain-able stacks
	 */
	willStopHandlerWithEvent(event) {
		describe(`Parser-Mock: ${this.name}`, () => {
			test("parser matches event with truthy/empty object response", async () => {
				const eventDef = new EventDef(event);
				const msg = await this.makeNew().parse(eventDef);
				expect(msg).toBeTruthy();
				if (msg !== true) {
					expect(msg).toEqual({});
				}
			});

			test("parser.parse() is called", async () => {
				const parser = require(`../../src/parsers/${this.name}`);
				const handle = new Handler();
				expect(handle.parsers).toContain(parser);
				const idx = handle.parsers.indexOf(parser);

				const mockMatchFn = jest.fn().mockImplementation(() => true);
				const mockParseFn = jest.fn().mockImplementation(() => false);
				const origParser = handle.parsers[idx];
				handle.parsers[idx] = Object.assign({}, origParser, {
					matches: mockMatchFn,
					parse: mockParseFn,
				});

				const eventDef = new EventDef(event);
				await handle.processEvent(eventDef);
				expect(mockMatchFn).toHaveBeenCalledTimes(1);
				expect(mockMatchFn).toHaveBeenCalledWith(eventDef);
				expect(mockParseFn).toHaveBeenCalledTimes(1);
				expect(mockParseFn).toHaveBeenCalledWith(eventDef);
			});

			test("parser forces Lambda handler to return null", async () => {
				const eventDef = new EventDef(event);
				const h = await new Handler().processEvent(eventDef);
				expect(h).toEqual(null);
			});
		});

		return this;
	}

	/**
	 * Confirm parser will STOP handler processing when given the provided SNS message.
	 *
	 * @param {string|{}} message Object or string message payload
	 * @param {string} [subject] SNS message subject
	 * @returns {ParserMock} Returns self for chain-able stacks
	 */
	willStopHandlerWithSnsEvent(message, subject) {
		this.willStopHandlerWithEvent(ParserMock.snsMessageToEvent(message, subject));
		return this;
	}
}

module.exports = ParserMock;
