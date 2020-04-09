//
// AWS ECS Event
//
exports.matches = event =>
	event.getSource() === "ecs";

exports.parse = event => {
	const time = new Date(event.get("time"));
	const detailType = event.get("detail-type");
	const status = event.get("detail.lastStatus");
	const desiredStatus = event.get("detail.desiredStatus");
	const service = event.get("detail.group");
	const clusterArn = event.parseArn(event.get("detail.clusterArn"));
	const clusterUrl = `https://console.aws.amazon.com/ecs/home?region=${clusterArn.region}#/${clusterArn.suffix}/services`;
	const logStream = event.get("detail.attempts[0].container.logStreamName");
	const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${event.getRegion()}#logs:`;
	// const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${event.get("region")}#logEventViewer:group=/aws/batch/job;stream=${logStream};`;
	const projectUrl = `https://console.aws.amazon.com/ecs/home?region=${event.getRegion()}`;
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

	if (status != desiredStatus) {
		color = event.COLORS.danger;
	}

	fields.push({
		title: "Last Status",
		value: `${status}`,
		short: true
	});

	fields.push({
		title: "Desired Status",
		value: `${desiredStatus}`,
		short: true
	});

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

	fields.push({
		title: "Cluster",
		value: `<${clusterUrl}|Cluster Services>`,
		short: true
	});

	return event.attachmentWithDefaults({
		author_name: `Amazon ECS - ${detailType}`,
		fallback: `${service} ${status}`,
		color: color,
		title: title,
		fields: fields,
		mrkdwn_in: ["title", "text"]
	});
};
