//
// AWS CodeDeploy via CloudWatch event rule
//
exports.matches = event =>
	event.getSource() === "codedeploy";

exports.parse = event => {
	const deployState = event.get("detail.state");
	const deploymentGroup = event.get("detail.deploymentGroup");
	const deploymentId = event.get("detail.deploymentId");
	const app = event.get("detail.application");
	const statusUrl = `https://console.aws.amazon.com/codedeploy/home?region=${event.getRegion()}#/deployments/${deploymentId}`;
	const fields = [];

	let color = event.COLORS.neutral;
	const baseTitle = `CodeDeploy Application ${app}`;
	let title = baseTitle;
	if (deployState === "SUCCESS") {
		title = `<${statusUrl}|${baseTitle}> has finished`;
		color = event.COLORS.ok;
	}
	else if (deployState === "STOP") {
		title = `<${statusUrl}|${baseTitle}> was stopped`;
		color = event.COLORS.warning;
	}
	else if (deployState === "FAILURE") {
		title = `<${statusUrl}|${baseTitle}> has failed`;
		color = event.COLORS.critical;
	}
	else if (deployState === "START") {
		title = `<${statusUrl}|${baseTitle}> has started deploying`;
	}

	if (deployState) {
		fields.push({
			title: "Status",
			value: deployState,
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
		fallback: `${baseTitle} ${deployState}`,
		color,
		title,
		fields,
		mrkdwn_in: ["title", "text"],
	});
};
