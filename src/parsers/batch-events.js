"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class BatchParser {

	parse(event) {
		return BbPromise.try(() => JSON.parse(_.get(event, "Records[0].Sns.Message", "{}")))
			.catch(_.noop) // ignore JSON errors
			.then(event => {
				if (_.get(event, "source") !== "aws.batch") {
					return BbPromise.resolve(false);
				}

				const time = new Date(_.get(event, "time"));
				const status = _.get(event, "detail.status");
				const reason = _.get(event, "detail.statusReason");
				const jobName = _.get(event, "detail.jobName");
				const logStream = _.get(event, "detail.attempts[0].container.logStreamName");
				const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${event.region}#logEventViewer:group=/aws/batch/job;stream=${logStream};`;
				const fields = [];

				let color = Slack.COLORS.neutral;
				const baseTitle = `Batch Job Event ${jobName}`;
				let title = baseTitle;
				if (status === "SUCCESS") {
					title = `${jobName} succeeded`;
					color = Slack.COLORS.ok;
				}
				else if (status === "FAILED") {
					title = `${jobName} failed`;
					color = Slack.COLORS.critical;
				}

				fields.push({
					title: "Status",
					value: status,
					short: true
				});

				fields.push({
					title: "Reason",
					value: `${reason}`,
					short: true
				});

				fields.push({
					title: "Logs",
					value: `<${logsUrl}|View Logs>`,
					short: true
				});

				const slackMessage = {
					attachments: [{
						author_name: "AWS Batch Notification",
						fallback: `${baseTitle} ${status}`,
						color: color,
						title: title,
						fields: fields,
						mrkdwn_in: [ "title", "text" ],
						ts: Slack.toEpochTime(time)
					}]
				};
				return BbPromise.resolve(slackMessage);
			});
	}
}

module.exports = BatchParser;
