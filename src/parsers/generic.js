"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class GenericParser {

	parse(event) {
		return BbPromise.try(() => {
			let text, time, title;
			if (_.has(event, "Records[0].Sns.Message")) {
				// Output the SNS message body
				title = _.get(event, "Records[0].Sns.Subject");
				text = _.get(event, "Records[0].Sns.Message");
				time = new Date(_.get(event, "Records[0].Sns.Timestamp"));
			}
			else {
				// Serialize the whole event data
				text = event;
			}

			if (!_.isString(text)) {
				text = JSON.stringify(text, null, 2);
			}

			const slackMessage = {
				attachments: [{
					fallback: text,
					color: Slack.COLORS.neutral,
					ts: Slack.toEpochTime(time ? time : new Date()),
					title,
					text
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = GenericParser;
