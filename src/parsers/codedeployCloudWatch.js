//
// AWS CodeDeploy via CloudWatch event rule
//
module.exports.matches = event =>
	event.getSource() === "codedeploy";

module.exports.parse = event => {
	const deployState = _.get(event, "detail.state");
	const deploymentGroup = _.get(event, "detail.deploymentGroup");
	const deploymentId = _.get(event, "detail.deploymentId");
	const app = _.get(event, "detail.application");
	const statusUrl = `https://console.aws.amazon.com/codedeploy/home?region=${event.region}#/deployments/${deploymentId}`;
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
