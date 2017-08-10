"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class BeanstalkParser {

	parse(event) {
		return BbPromise.try(() => {
			const subject = _.get(event, "Records[0].Sns.Subject", "");
			if (!_.startsWith(subject, "AWS Elastic Beanstalk Notification")) {
				// Not of interest for us
				return BbPromise.resolve(false);
			}

			// Split the incoming message into individual fields for easier parsing
			const lines = _.split(_.get(event, "Records[0].Sns.Message", ""), "\n");
			const message = _.reduce(lines, (returnObj, line) => {
				if (!_.isEmpty(line) && _.includes(line, ":")) {
					const key = _.trim(line.substr(0, line.indexOf(":")));
					const value = _.trim(line.substr(key.length + 1));
					return _.extend(returnObj, { [key]: value });
				}
				return returnObj;
			}, {});

			if (!_.has(message, "Message") || !_.has(message, "Application") ||
				!_.has(message, "Environment") || !_.has(message, "Timestamp")) {
				// Doesn't seem like we can parse this - so not of interest for us
				return BbPromise.resolve(false);
			}

			// RDS Message
			const text = _.get(message, "Message");
			const application = _.get(message, "Application");
			const environment = _.get(message, "Environment");
			const environmentUrl = _.get(message, "Environment URL");
			const time = _.get(message, "Timestamp");

			let color = Slack.COLORS.accent;
			let newState = null;
			let oldState = null;
			const match = text.match(/from (\w+) to (\w+)\.$/i);
			if (match && match.length > 2) {
				oldState = match[1];
				newState = match[2];
				if (newState === "Ok") {
					color = Slack.COLORS.ok;
				}
				else if (newState === "Warning") {
					color = Slack.COLORS.warning;
				}
				else if (newState === "Degraded") {
					color = Slack.COLORS.critical;
				}
			}

			const slackMessage = {
				attachments: [{
					fallback: `${application} / ${environment}: ${text}`,
					color: color,
					author_name: "AWS Elastic Beanstalk",
					title: `${application} / ${environment}`,
					title_link: environmentUrl,
					text: text,
					fields: [{
						title: "Application",
						value: application,
						short: true
					}, {
						title: "Environment",
						value: environment,
						short: true
					}, {
						title: "Old State",
						value: oldState,
						short: true
					}, {
						title: "New State",
						value: newState,
						short: true
					}],
					ts: Slack.toEpochTime(new Date(time))
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = BeanstalkParser;
