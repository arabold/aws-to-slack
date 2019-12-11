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
	const fields = [];

	const baseTitle = event.getLink(
		`CodeDeploy Application ${app}`,
		event.consoleUrl(`/codedeploy/home#/deployments/${deploymentId}`)
	).toString();

	let color = event.COLORS.neutral;
	let title = baseTitle;
	if (deployStatus === "SUCCEEDED") {
		title = `${baseTitle} has finished`;
		color = event.COLORS.ok;
	}
	else if (deployStatus === "STOPPED") {
		title = `${baseTitle} was stopped`;
		color = event.COLORS.warning;
	}
	else if (deployStatus === "FAILED") {
		title = `${baseTitle} has failed`;
		color = event.COLORS.critical;
	}
	else if (deployStatus === "CREATED") {
		title = `${baseTitle} has started deploying`;
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
