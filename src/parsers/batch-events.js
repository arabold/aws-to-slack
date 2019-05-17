//
// AWS Batch event parser
//
exports.matches = event =>
	event.getSource() === "batch";

exports.parse = event => {
	const status = event.get("detail.status");
	const reason = event.get("detail.statusReason");
	const jobName = event.get("detail.jobName");
	const logStream = event.get("detail.attempts[0].container.logStreamName");
	const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${event.get("region")}#logEventViewer:group=/aws/batch/job;stream=${logStream};`;
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
