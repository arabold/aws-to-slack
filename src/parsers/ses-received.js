"use strict";

const _ = require("lodash"),
	SNSParser = require("./sns"),
	Slack = require("../slack");

/**
 * Parses SES "Received" notifications incoming via SNS
 */
class SesReceivedParser extends SNSParser {

	handleMessage(message) {
		if (_.get(message, "notificationType") !== "Received") {
			// Not of interest for us
			return false;
		}

		// AWS SES Message
		const source = _.get(message, "mail.source");
		const destination = _.get(message, "mail.destination");
		const timestamp = _.get(message, "mail.timestamp");
		const subject = _.get(message, "mail.commonHeaders.subject");
		const content = _.get(message, "content");

		const fields = [];
		if (source) {
			fields.push({
				title: "From",
				value: source,
				short: true
			});
		}
		if (destination) {
			fields.push({
				title: "To",
				value: _.join(destination, ",\n"),
				short: true
			});
		}

		return {
			attachments: [{
				fallback: "New email received from SES",
				color: Slack.COLORS.accent,
				author_name: "Amazon SES",
				title: subject,
				text: content,
				fields: fields,
				ts: Slack.toEpochTime(new Date(timestamp))
			}]
		};
	}
}

module.exports = SesReceivedParser;
