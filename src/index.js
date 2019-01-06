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

let lastSelectedHandler;

async function processIncoming(event) {
	if (_.isString(event)) {
		try {
			event = JSON.parse(event);
		}
		catch (err) {
			console.error(`Error parsing event JSON (continuing...): ${event}`);
		}
	}

	// Execute all parsers and use the first successful result
	for (const i in parsers) {
		const parserName = parsers[i][0];
		try {
			const message = await ((new parsers[i][1]()).parse(event));
			if (message) {
				lastSelectedHandler = parserName;

				// Truthy but empty message will stop execution
				if (message === true || _.isEmpty(message)) {
					console.error(`Parser stopping execution: ${parserName}`);
					return null;// never send empty message
				}

				return message;
			}
		}
		catch (e) {
			console.error(`Error parsing event [parser:${parserName}]:`, e);
		}
	}
}

module.exports.processEvent = processIncoming;

module.exports.handler = async (event, context, callback) => {
	context.callbackWaitsForEmptyEventLoop = false;
	console.log("Incoming Message:", JSON.stringify(event, null, 2));

	try {
		const message = await processIncoming(event);
		if (message) {
			console.log(`Sending Slack message from Parser[${lastSelectedHandler}]:`, JSON.stringify(message, null, 2));
			await Slack.postMessage(message);
		}
		else {
			console.log("No parser matched event");
		}
		callback();
	}
	catch (e) {
		console.log("ERROR:", e);
		callback(e);
	}
};
