const _ = require("lodash")
	, EventDef = require("./eventdef")
	, Slack = require("./slack")
	, Emailer = require("./ses")
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
		"codepipeline",
		"codepipeline-approval",
		"guardduty",
		"inspector",
		"rds",
		"ses-received",
		// Last attempt to parse, will match any message:
		"generic",
	];

class LambdaHandler {

	constructor(waterfall = defaultParserWaterfall) {
		this.lastParser = null;
		this.parsers = _.map(waterfall, name => {
			const parser = require(`./parsers/${name}`);
			if (!parser.name) {
				// modify package in-memory
				parser.name = name;
			}
			return parser;
		});
	}

	/**
	 * Run .parse() on each handler in-sequence.
	 *
	 * @param {EventDef} eventDef Single-event object
	 * @returns {Promise<?{}>} Resulting message or null if no match found
	 */
	async processEvent(eventDef) {
		const matchingParsers = this.matchToParser(eventDef);
		if (!matchingParsers.length) {
			console.error("No parsers matched!");
		}
		if (matchingParsers.length > 2) {
			// [0] => custom parser
			// [1] => custom parser <<< this is the problem!
			// [2] => generic parser
			console.log("Multiple Parsers matched (using first):", _.map(matchingParsers, p => p.name));
		}

		// Execute all parsers and use the first successful result
		for (const parser of matchingParsers) {
			const parserName = parser.name;
			this.lastParser = parserName;
			try {
				const message = await parser.parse(eventDef);
				if (message) {
					// Truthy but empty message will stop execution
					if (message === true || _.isEmpty(message)) {
						// leave value in this.lastParser
						return null;// never send empty message
					}

					return { parser, parserName, slackMessage: message };
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
	 * Return all matched parsers for event.
	 *
	 * @param {EventDef} eventDef Event abstraction instance
	 * @returns {Array} List of parsers that claim to match event
	 */
	matchToParser(eventDef) {
		return _.filter(this.parsers, parser => {
			try {
				return parser.matches(eventDef);
			}
			catch (err) {
				console.error(`matchToParser[${parser.name}]`, err);
				return false;
			}
		});
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
			const waitingTasks = [];

			// Handle SNS payloads with >1 messages differently!
			// To keep parsers as simple as possible, merge event into single-Record messages.
			const Records = _.get(event, "Records");
			if (_.isArray(Records) && Records.length > 1) {
				for (const i in Records) {
					// Copy single record into event
					const singleRecordEvent = _.assign({}, event, {
						Records: [ Records[i] ],
					});

					const res = await handler.processEvent(new EventDef(singleRecordEvent));
					if (res) {
						const message = res.slackMessage;
						console.log(`SNS-Record[${i}]: Sending Slack message from Parser[${res.parserName}]:`, JSON.stringify(message, null, 2));
						waitingTasks.push(Slack.postMessage(message));
						waitingTasks.push(Emailer.checkAndSend(message, event));
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
				const res = await handler.processEvent(new EventDef(event));
				if (res) {
					const message = res.slackMessage;
					console.log(`Sending Slack message from Parser[${res.parserName}]:`, JSON.stringify(message, null, 2));
					waitingTasks.push(Slack.postMessage(message));
					waitingTasks.push(Emailer.checkAndSend(message, event));
				}
				else if (handler.lastParser) {
					console.error(`Parser[${handler.lastParser}] is force-ignoring event`);
				}
				else {
					console.log("No parser matched event");
				}
			}

			await Promise.all(waitingTasks);

			callback();
		}
		catch (e) {
			console.log("ERROR:", e);
			callback(e);
		}
	}
}

module.exports = LambdaHandler;
