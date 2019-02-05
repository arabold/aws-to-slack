"use strict";

const _ = require("lodash")
	, Slack = require("./slack")
	, defaultParserWaterfall = [
		// Ordered list of parsers:
		"cloudwatch",
		"codecommit/pullrequest",
		"codecommit/repository",
		"autoscaling",
		"aws-health",
		"batch-events",
		"beanstalk",
		"cloudformation",
		"codebuild",
		"codedeployCloudWatch",
		"codedeploySns",
		"codepipelineSns",
		"codepipeline-approval",
		"codepipelineCloudWatch",
		"guardduty",
		"inspector",
		"rds",
		"ses-received",
		// Last attempt to parse, will match any message:
		"generic",
	];

class LambdaHandler {

	constructor() {
		// clone so can be tested
		this.parsers = new Array(defaultParserWaterfall.length);
		this.parserNames = new Array(defaultParserWaterfall.length);
		_.each(defaultParserWaterfall, (name, i) => {
			this.parserNames[i] = name;
			this.parsers[i] = require(`./parsers/${name}`);
		});
		this.lastParser = null;
	}

	/**
	 * Run .parse() on each handler in-sequence.
	 *
	 * @param {{}} event Single-event object
	 * @returns {Promise<?{}>} Resulting message or null if no match found
	 */
	async processEvent(event) {
		// Execute all parsers and use the first successful result
		for (const i in this.parsers) {
			const parserName = this.parserNames[i];
			this.lastParser = parserName;
			try {
				const parser = new this.parsers[i]();
				const message = await parser.parse(event);
				if (message) {
					// Truthy but empty message will stop execution
					if (message === true || _.isEmpty(message)) {
						// leave value in this.lastParser
						return null;// never send empty message
					}

					// Set return value as properties of object
					parser.slackMessage = message;
					parser.name = parserName;
					return parser;
				}
			}
			catch (e) {
				console.error(`Error parsing event [parser:${parserName}]:`, e);
			}
			// clear state
			this.lastParser = null;
		}
	}

	/**
	 * Lambda event handler.
	 *
	 * @param {{}} event Event object received via Lambda payload
	 * @param {{}} context Lambda execution context
	 * @param {Function} callback Lambda completion callback
	 * @returns {Promise<void>} No return value
	 */
	static async handler(event, context, callback) {
		context.callbackWaitsForEmptyEventLoop = false;
		console.log("Incoming Message:", JSON.stringify(event, null, 2));

		if (_.isString(event)) {
			try {
				event = JSON.parse(event);
			}
			catch (err) {
				console.error(`Error parsing event JSON (continuing...): ${event}`);
			}
		}

		try {
			const handler = new LambdaHandler();

			// Handle SNS payloads with >1 messages differently!
			// To keep parsers as simple as possible, merge event into single-Record messages.
			const Records = _.get(event, "Records");
			if (_.isArray(Records) && Records.length > 1) {
				for (const i in Records) {
					// Copy single record into event
					const singleRecordEvent = _.assign({}, event, {
						Records: [ Records[i] ],
					});

					const parser = await handler.processEvent(singleRecordEvent);
					if (parser) {
						const message = parser.slackMessage;
						console.log(`SNS-Record[${i}]: Sending Slack message from Parser[${parser.name}]:`, JSON.stringify(message, null, 2));
						await Slack.postMessage(message);
					}
					else if (handler.lastParser) {
						console.error(`SNS-Record[${i}]: Parser[${handler.lastParser}] is force-ignoring record`);
					}
					else {
						console.log(`SNS-Record[${i}]: No parser matched record`);
					}
				}
			}
			else {
				const parser = await handler.processEvent(event);
				if (parser) {
					const message = parser.slackMessage;
					console.log(`Sending Slack message from Parser[${parser.name}]:`, JSON.stringify(message, null, 2));
					await Slack.postMessage(message);
				}
				else if (handler.lastParser) {
					console.error(`Parser[${handler.lastParser}] is force-ignoring event`);
				}
				else {
					console.log("No parser matched event");
				}
			}

			callback();
		}
		catch (e) {
			console.log("ERROR:", e);
			callback(e);
		}
	}
}

module.exports = LambdaHandler;
