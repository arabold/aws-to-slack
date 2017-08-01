"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class GenericParser {

	parse(event) {
		return BbPromise.try(() => {
			const message = JSON.parse(_.get(event, "Records[0].Sns.Message", "{}"));
			if (_.get(message, "Event Source") !== "db-instance") {
				// Not of interest for us
				return BbPromise.resolve(false);
			}

			// RDS Message
			const text = _.get(message, "Event Message");
			const instanceId = _.get(message, "Source ID");
			const link = _.get(message, "Identifier Link");
			const time = _.get(message, "Event Time");

			const slackMessage = {
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
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = GenericParser;
