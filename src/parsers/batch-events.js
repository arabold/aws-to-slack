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
	const logsUrl = event.consoleUrl(`/cloudwatch/home#logEventViewer:group=/aws/batch/job;stream=${logStream};`);
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

	const logLink = event.getLink("View Logs", logsUrl);
	if (logLink.willPrintLink) {
		fields.push({
			title: "Logs",
			value: logLink.toString(),
			short: true
		});
	}

	return event.attachmentWithDefaults({
		author_name: "AWS Batch Notification",
		fallback: `${baseTitle} ${status}`,
		color: color,
		title: title,
		fields: fields,
		mrkdwn_in: ["title", "text"],
	});
};
