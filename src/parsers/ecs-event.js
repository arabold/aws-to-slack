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
	const region = event.parseArn(event.get("detail.clusterArn")).region;
	const cluster = event.parseArn(event.get("detail.clusterArn")).resource.slice(8);
	const clusterUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services`;
	const fields = [];

	var title = `${cluster} - ${detailType} - ${status}`;
	var color = event.COLORS.neutral;

	if (detailType === "ECS Task State Change") {

		const service = event.get("detail.group").slice(8);
		const serviceUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services/${service}/details`

		const getTask = event.parseArn(event.get("detail.taskArn")).resource;
		const task = getTask.slice(5).replace(cluster+'/', '');
		const taskUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/tasks/${task}/details`;
		const logsUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services/${service}/logs`

		var stoppedReason = "Unknown";
		title = null;

		// default is warning
		color = event.COLORS.warning;

		if (status === "RUNNING" && desiredStatus === "RUNNING") {
			color = event.COLORS.ok;
		}
		else if (desiredStatus === "STOPPED") {
			stoppedReason = event.get("detail.stoppedReason");
			color = event.COLORS.critical;
		}

		fields.push({
			title: "Task",
			value: `<${taskUrl}|${task}>`,
			short: false
		});

		fields.push({
			title: "Status",
			value: `${status}`,
			short: true
		});

		fields.push({
			title: "Desired Status",
			value: `${desiredStatus}`,
			short: true
		});

		fields.push({
			title: "Reason",
			value: `${stoppedReason}`,
			short: true
		});

		fields.push({
			title: "Service Logs",
			value: `<${logsUrl}|View Logs>`,
			short: true
		});

		fields.push({
			title: "Service",
			value: `<${serviceUrl}|${service}>`,
			short: false
		});

		fields.push({
			title: "Cluster",
			value: `<${clusterUrl}|${cluster}>`,
			short: false
		});
	
	}
	else if (detailType === "ECS Service Action") {

		const eventType = event.get("detail.eventType");
		const eventName = event.get("detail.eventName");
		const getService = event.parseArn(event.get("resources")).resource;
		const service = getService.slice(8).replace(cluster+'/', '');
		const serviceUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services/${service}/details`
		const logsUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services/${service}/logs`

		title = null;

		if (eventType === "INFO") {
			color = event.COLORS.ok;
		}
		else if (status === "WARN") {
			color = event.COLORS.warning;
		}
		else if (status === "ERROR") {
			color = event.COLORS.critical;
		}

		fields.push({
			title: "Service",
			value: `<${serviceUrl}|${service}>`,
			short: false
		});

		fields.push({
			title: "Status",
			value: `${eventName}`,
			short: true
		});

		fields.push({
			title: "Service Logs",
			value: `<${logsUrl}|View Logs>`,
			short: true
		});

		fields.push({
			title: "Cluster",
			value: `<${clusterUrl}|${cluster}>`,
			short: false
		});	

	}

	return event.attachmentWithDefaults({
		author_name: `Amazon ECS - ${detailType}`,
		fallback: `${title}`,
		color: color,
		title: title,
		fields: fields,
		mrkdwn_in: ["title", "text"]
	});
};