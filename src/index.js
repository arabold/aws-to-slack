"use strict";

const _ = require("lodash"),
	Slack = require("./slack"),
	parsers = _.map([
		// Ordered list of parsers:
		"cloudwatch",
		"codecommit/pullrequest",
		"codecommit/repository",
		"autoscaling",
		"aws-health",
		"beanstalk",
		"codebuild",
		"codedeployCloudWatch",
		"codedeploySns",
		"codepipeline",
		"codepipeline-approval",
		"guardduty",
		"inspector",
		"rds",
		"ses-received",
		// Last attempt to parse, will match any:
		"generic",
	], name => [name, require(`./parsers/${name}`)]);

/**
 * Run .parse() on each handler in-sequence.
 *
 * @param {{}} event Single-event object
 * @returns {Promise<?{}>} Resulting message or null if no match found
 */
module.exports.processEvent = async (event) => {
	// Execute all parsers and use the first successful result
	for (const i in parsers) {
		const parserName = parsers[i][0];
		try {
			const parser = new parsers[i][1]();
			const message = await parser.parse(event);
			if (message) {
				// Truthy but empty message will stop execution
				if (message === true || _.isEmpty(message)) {
					console.error(`Parser stopping execution: ${parserName}`);
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
	}
};

module.exports.handler = async (event, context, callback) => {
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
		if (_.isArray(event.Records) && event.Records.length > 1) {
			// If SNS contains >1 record, process each independently for they may be different types
			for (const i in event.Records) {
				// Copy single record into event
				const singleRecordEvent = _.assign({}, event, {
					Records: [ event.Records[i] ],
				});

				const parser = await exports.processEvent(singleRecordEvent);
				if (parser) {
					const message = parser.slackMessage;
					console.log(`Sending Slack message from SNS-Parser[${parser.name}]:`, JSON.stringify(message, null, 2));
					await Slack.postMessage(message);
				}
				else {
					console.log(`No parser matched SNS event index ${i}`);
				}
			}
		}
		else {
			const parser = await exports.processEvent(event);
			if (parser) {
				const message = parser.slackMessage;
				console.log(`Sending Slack message from Parser[${parser.name}]:`, JSON.stringify(message, null, 2));
				await Slack.postMessage(message);
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
};
