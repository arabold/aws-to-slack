"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class EmailParser {

	parse(event) {
		return BbPromise.try(() => JSON.parse(_.get(event, "Records[0].Sns.Message", "{}")))
		.catch(_.noop) // ignore JSON errors
		.then(message => {
			if (_.get(message, "notificationType") !== "Received") {
				// Not of interest for us
				return BbPromise.resolve(false);
			}

			// AWS SES Message
			console.log("message =", JSON.stringify(message, null, 2));
			const source = _.get(message, "mail.source");
			const messageId = _.get(message, "mail.messageId");
			const timestamp = _.get(message, "mail.timestamp");
			const subject = _.get(message, "mail.commonHeaders.subject");

			let color = Slack.COLORS.accent;

			const fields = [{
				title: "Subject",
				value: subject,
				short: true
			}];
			if (source) {
				fields.push({
					title: "From",
					value: source,
					short: true
				});
			}
			if (subject) {
				fields.push({
					title: "Subject",
					value: subject,
					short: true
				});
			}

			const slackMessage = {
				attachments: [{
					fallback: "New email received from SES",
					color: color,
					title: subject,
					text: "",
					fields: fields,
					ts: Slack.toEpochTime(new Date(timestamp))
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = EmailParser;
