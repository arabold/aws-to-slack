"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class AwsHealthParser {

	parse(event) {
		return BbPromise.try(() => JSON.parse(_.get(event, "Records[0].Sns.Message", "{}")))
		.catch(_.noop) // ignore JSON errors
		.then(message => {
			if (_.get(message, "source") !== "aws.health") {
				// Not of interest for us
				return BbPromise.resolve(false);
			}

			// AWS Health Dashboard Message
			const accountId = _.get(message, "account");
			const detailType = _.get(message, "detail-type");
			const service = _.get(message, "detail.service");
			const eventTypeCategory = _.get(message, "detail.eventTypeCategory");
			const eventDescription = _.get(message, "detail.eventDescription");
			const affectedEntities = _.get(message, "detail.affectedEntities");
			const time = _.get(message, "time");
			const startTime = _.get(message, "detail.startTime");
			const endTime = _.get(message, "detail.endTime");

			let text = _.get(_.find(eventDescription, [ "language", "en_US" ]), "latestDescription");
			if (!text) {
				text = _.get(_.first(eventDescription), "latestDescription");
			}

			// Valid type categories are: issue | accountNotification | scheduledChange
			let color = Slack.COLORS.accent;
			if (eventTypeCategory === "issue") {
				color = Slack.COLORS.warning;
			}

			const fields = [{
				title: "Account ID",
				value: accountId,
				short: true
			}];
			if (service) {
				fields.push({
					title: "Service",
					value: service,
					short: true
				});
			}
			if (startTime) {
				fields.push({
					title: "Start Time",
					value: (new Date(startTime)).toLocaleString(),
					short: true
				});
			}
			if (endTime) {
				fields.push({
					title: "End Time",
					value: (new Date(endTime)).toLocaleString(),
					short: true
				});
			}
			if (_.size(affectedEntities) > 0) {
				fields.push({
					title: "Affected Entities",
					value: _.join(_.map(affectedEntities, "entityValue"), "\n")
				});
			}

			const slackMessage = {
				attachments: [{
					fallback: text,
					color: color,
					title: detailType,
					text: text,
					fields: fields,
					ts: Slack.toEpochTime(new Date(startTime || time))
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = AwsHealthParser;
