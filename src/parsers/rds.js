"use strict";

const _ = require("lodash"),
	SNSParser = require("./sns"),
	Slack = require("../slack");

class GenericParser extends SNSParser {

	handleMessage(message) {
		if (_.get(message, "Event Source") !== "db-instance") {
			// Not of interest for us
			return false;
		}

		// RDS Message
		const text = _.get(message, "Event Message");
		const instanceId = _.get(message, "Source ID");
		const link = _.get(message, "Identifier Link");
		const time = _.get(message, "Event Time");

		return {
			attachments: [{
				fallback: `${instanceId}: ${text}`,
				color: Slack.COLORS.accent,
				author_name: "Amazon RDS",
				title: instanceId,
				title_link: link,
				text: text,
				ts: Slack.toEpochTime(new Date(time))
			}]
		};
	}
}

module.exports = GenericParser;
