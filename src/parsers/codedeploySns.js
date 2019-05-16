//
// AWS CodeDeploy SNS notifications
//
exports.matches = event =>
	_.has(event.message, "deploymentId") && _.has(event.message, "deploymentGroupName");

exports.parse = event => {
	const deployStatus = event.get("status");
	const deploymentGroup = event.get("deploymentGroupName");
	const deploymentId = event.get("deploymentId");
	const app = event.get("applicationName");
	const statusUrl = `https://console.aws.amazon.com/codedeploy/home?region=${event.getRegion()}#/deployments/${deploymentId}`;
	const fields = [];

	let color = event.COLORS.neutral;
	const baseTitle = `CodeDeploy Application ${app}`;
	let title = baseTitle;
	if (deployStatus === "SUCCEEDED") {
		title = `<${statusUrl}|${baseTitle}> has finished`;
		color = event.COLORS.ok;
	}
	else if (deployStatus === "STOPPED") {
		title = `<${statusUrl}|${baseTitle}> was stopped`;
		color = event.COLORS.warning;
	}
	else if (deployStatus === "FAILED") {
		title = `<${statusUrl}|${baseTitle}> has failed`;
		color = event.COLORS.critical;
	}
	else if (deployStatus === "CREATED") {
		title = `<${statusUrl}|${baseTitle}> has started deploying`;
	}

	if (deployStatus) {
		fields.push({
			title: "Status",
			value: deployStatus,
			short: true
		});
	}

	fields.push({
		title: "DeploymentGroup",
		value: `${deploymentGroup}`,
		short: true
	});

	return event.attachmentWithDefaults({
		author_name: "AWS CodeDeploy Notification",
		fallback: `${baseTitle} ${deployStatus}`,
		color,
		title,
		fields,
		mrkdwn_in: ["title", "text"],
	});
};
