//
// AWS Batch event parser
//
const _ = require("lodash");

module.exports.matches = event => event.getSource() === "batch";

module.exports.parse = event => {
	const message = event.message;
	const status = _.get(message, "detail.status");
	const reason = _.get(message, "detail.statusReason");
	const jobName = _.get(message, "detail.jobName");
	const logStream = _.get(message, "detail.attempts[0].container.logStreamName");
	const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${message.region}#logEventViewer:group=/aws/batch/job;stream=${logStream};`;
	const fields = [];

	let color = event.COLORS.neutral;
	const baseTitle = `Batch Job Event ${jobName}`;
	let title = baseTitle;
	if (status === "SUCCESS") {
		title = `${jobName} succeeded`;
		color = event.COLORS.ok;
	}
	else if (status === "FAILED") {
		title = `${jobName} failed`;
		color = event.COLORS.critical;
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

	return event.attachmentWithDefaults({
		author_name: "AWS Batch Notification",
		fallback: `${baseTitle} ${status}`,
		color: color,
		title: title,
		fields: fields,
		mrkdwn_in: ["title", "text"],
	});
};
