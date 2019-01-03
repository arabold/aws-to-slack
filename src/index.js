"use strict";

const _ = require("lodash"),
	Slack = require("./slack"),
	GenericParser = require("./parsers/generic"),
	parsers = _.map([
		"./parsers/cloudwatch",
		"./parsers/codecommit/pullrequest",
		"./parsers/codecommit/repository",
		"./parsers/autoscaling",
		"./parsers/aws-health",
		"./parsers/beanstalk",
		"./parsers/codebuild",
		"./parsers/codedeploy",
		"./parsers/inspector",
		"./parsers/rds",
		"./parsers/ses-received",
	], name => [name, require(name)]);

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
	let message;
	for (const i in parsers) {
		const parserName = parsers[i][0];
		try {
			message = await ((new parsers[i][1]()).parse(event));
			if (message) {
				// Truthy but empty message will stop execution
				if (message === true || _.isEmpty(message)) {
					console.error(`Parser stopping execution: ${parserName}`);
					return null;
				}
				break;
			}
		}
		catch (e) {
			console.error(`[Error parsing event][${parserName}] ${e}`);
		}
	}
	if (!message) {
		// Fallback to the generic parser if none other succeeded
		console.log("Falling back to GenericParser...");
		message = await (new GenericParser).parse(event);
	}

	return message;
}

module.exports.processEvent = processIncoming;

module.exports.handler = async (event, context, callback) => {
	context.callbackWaitsForEmptyEventLoop = false;
	console.log("Incoming Message:", JSON.stringify(event, null, 2));

	try {
		const message = await processIncoming(event);
		console.log("Sending Message to Slack:", JSON.stringify(message, null, 2));
		await Slack.postMessage(message);
		callback();
	}
	catch (e) {
		console.log("ERROR:", e);
		callback(e);
	}
};
