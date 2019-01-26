"use strict";

const _ = require("lodash")
	, SNSParser = require("./sns")
	, Slack = require("../slack");

class BatchParser extends SNSParser {

	handleMessage(message) {
		if (_.get(message, "source") !== "aws.batch") {
			return false;
		}

		const time = new Date(_.get(message, "time"));
		const status = _.get(message, "detail.status");
		const reason = _.get(message, "detail.statusReason");
		const jobName = _.get(message, "detail.jobName");
		const logStream = _.get(message, "detail.attempts[0].container.logStreamName");
		const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${message.region}#logEventViewer:group=/aws/batch/job;stream=${logStream};`;
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

		return {
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
	}
}

module.exports = BatchParser;
