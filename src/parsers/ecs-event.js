//
// AWS ECS Event
//
exports.matches = event =>
	event.getSource() === "aws.ecs";

exports.parse = event => {
	const time = new Date(event.get("time"));
	const detailType = event.get("detail-type");
	const status = event.get("detail.lastStatus");
	const service = event.get("detail.group");
	const logStream = event.get("detail.attempts[0].container.logStreamName");
	const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${event.region}#logs:`;
	// const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${event.get("region")}#logEventViewer:group=/aws/batch/job;stream=${logStream};`;
	const projectUrl = `https://console.aws.amazon.com/ecs/home?region=${event.region}`;
	const fields = [];

	let color = event.COLORS.neutral;
	let title = `${service} - ${detailType} - ${status}`;
	if (status === "RUNNING") {
		title = `<${projectUrl}|${service}> is running`;
		color = event.COLORS.ok;
	}
	else if (status === "STOPPED") {
		const stoppedReason = event.get("detail.stoppedReason");
		title = `<${projectUrl}|${service}> was stopped: ${stoppedReason}`;
		color = event.COLORS.warning;
	}

	if (status) {
		fields.push({
			title: "Status",
			value: status,
			short: true
		});
	}

	fields.push({
		title: "Service",
		value: `${service}`,
		short: true
	});

	fields.push({
		title: "Logs",
		value: `<${logsUrl}|View Logs>`,
		short: true
	});

	return event.attachmentWithDefaults({
		author_name: `Amazon ECS - {detailType}`,
		fallback: `${service} ${status}`,
		color: color,
		title: title,
		fields: fields,
		mrkdwn_in: ["title", "text"]
	});
};
