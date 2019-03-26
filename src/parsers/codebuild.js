const _ = require("lodash");

module.exports.matches = event => event.getSource() === "codebuild";

module.exports.parse = event => {
	const buildStatus = _.get(event, "detail.build-status");
	const project = _.get(event, "detail.project-name");
	const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${event.region}#logEventViewer:group=/aws/codebuild/${project};start=PT5M`;
	const buildId = _.split(_.get(event, "detail.build-id"), ":").pop();
	const buildUrl = `https://console.aws.amazon.com/codebuild/home?region=${event.region}#/builds/${encodeURIComponent(project + ":" + buildId)}/view/new`;
	const fields = [];

	let color = event.COLORS.neutral;
	let title = project;
	if (buildStatus === "SUCCEEDED") {
		title = `<${buildUrl}|${project}> has finished building`;
		color = event.COLORS.ok;
	}
	else if (buildStatus === "STOPPED") {
		title = `<${buildUrl}|${project}> was stopped`;
		color = event.COLORS.warning;
	}
	else if (buildStatus === "FAILED") {
		title = `<${buildUrl}|${project}> has failed to build`;
		color = event.COLORS.critical;
	}
	else if (buildStatus === "IN_PROGRESS") {
		title = `<${buildUrl}|${project}> has started building`;
	}

	if (buildStatus) {
		fields.push({
			title: "Status",
			value: buildStatus,
			short: true
		});
	}

	fields.push({
		title: "Logs",
		value: `<${logsUrl}|View Logs>`,
		short: true
	});

	return event.attachmentWithDefaults({
		author_name: "Amazon CodeBuild",
		fallback: `${project} ${buildStatus}`,
		color: color,
		title: title,
		fields: fields,
		mrkdwn_in: ["title", "text"],
	});
};
