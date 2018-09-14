"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("./slack");

function processIncoming(event) {
	const GenericParser = require("./parsers/generic");
	const parsers = [
		require("./parsers/cloudwatch"),
		require("./parsers/rds"),
		require("./parsers/beanstalk"),
		require("./parsers/aws-health"),
		require("./parsers/inspector"),
		require("./parsers/codebuild"),
		require("./parsers/ses-received"),
		require("./parsers/codecommit/pullrequest"),
		require("./parsers/codecommit/repository"),
	];

	// Execute all parsers and use the first successful result
	return BbPromise.any(_.map(parsers, Parser => {
		if (_.isEmpty(event)) {
			return BbPromise.resolve();
		}

		const parser = new Parser();
		return parser.parse(event)
		.then(result => result ? result : BbPromise.reject()); // reject on empty result
	}))
	.catch(BbPromise.AggregateError, err => {
		_.forEach(_.compact(err), err => {
			// Rethrow on internal errors
			return BbPromise.reject(err);
		});
		console.log("No parser was able to parse the message.");

		// Fallback to the generic parser if none other succeeded
		const parser = new GenericParser();
		return parser.parse(event);
	})
	.then(message => {
		// Finally forward the message to Slack
		if (_.isEmpty(message)) {
			console.log("Skipping empty message.");
			return BbPromise.resolve();
		}

		console.log("Sending Message to Slack:", JSON.stringify(message, null, 2));
		return Slack.postMessage(message);
	})
	.catch(err => {
		console.log("ERROR:", err);
	});
}

module.exports.handler = (event, context, callback) => {
	context.callbackWaitsForEmptyEventLoop = false;

	// no return here as we're invoking the callback directly
	console.log("Incoming Message:", JSON.stringify(event, null, 2));
	BbPromise.resolve(processIncoming(event)).asCallback(callback);
};
