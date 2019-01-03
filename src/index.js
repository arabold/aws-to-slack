"use strict";

const _ = require("lodash"),
	Slack = require("./slack"),
	GenericParser = require("./parsers/generic"),
	parsers = [
		require("./parsers/cloudwatch"),
		require("./parsers/codecommit/pullrequest"),
		require("./parsers/codecommit/repository"),
		require("./parsers/autoscaling"),
		require("./parsers/aws-health"),
		require("./parsers/beanstalk"),
		require("./parsers/codebuild"),
		require("./parsers/codedeploy"),
		require("./parsers/inspector"),
		require("./parsers/rds"),
		require("./parsers/ses-received"),
	];

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
	for (let i = 0; i < parsers.length; i++) {
		const parser = parsers[i];
		try {
			message = await ((new parser()).parse(event));
			if (message) {
				// Truthy but empty message will stop execution
				if (message === true || _.isEmpty(message)) {
					console.error(`Parser stopping execution: ${parser}`);
					return null;
				}
				break;
			}
		}
		catch (e) {
			console.error(`[Error parsing event][${parser}] ${e}`);
		}
	}
	if (!message) {
		// Fallback to the generic parser if none other succeeded
		console.log("No parser was able to parse the message.");
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
