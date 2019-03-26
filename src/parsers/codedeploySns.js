//
// AWS CodeDeploy SNS notifications
//
const _ = require("lodash");

module.exports.matches = event =>
	_.has(event.message, "deploymentId") && _.has(event.message, "deploymentGroupName");

module.exports.parse = event => {
	const message = event.message;
	const deployStatus = _.get(message, "status");
	const deploymentGroup = _.get(message, "deploymentGroupName");
	const deploymentId = _.get(message, "deploymentId");
	const app = _.get(message, "applicationName");
	const statusUrl = `https://console.aws.amazon.com/codedeploy/home?region=${message.region}#/deployments/${deploymentId}`;
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
