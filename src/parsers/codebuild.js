//
// AWS CodeBuild events
//
module.exports.matches = event =>
	event.getSource() === "codebuild";

module.exports.parse = event => {
	const msg = event.message;
	const buildStatus = _.get(msg, "detail.build-status");
	const project = _.get(msg, "detail.project-name");
	const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${msg.region}#logEventViewer:group=/aws/codebuild/${project};start=PT5M`;
	const buildId = _.split(_.get(msg, "detail.build-id"), ":").pop();
	const buildUrl = `https://console.aws.amazon.com/codebuild/home?region=${event.getRegion()}#/builds/${encodeURIComponent(project + ":" + buildId)}/view/new`;

	const author_name = "AWS CodeBuild"
		+ (event.getAccountId() ? ` (${event.getAccountId()})` : "");
	const title = project;
	const title_link = buildUrl;
	const fields = [];

	const color = (COLORS => {
		switch (buildStatus) {
		case "SUCCEEDED":
			return COLORS.ok;
		case "STOPPED":
			return COLORS.warning;
		case "FAILED":
			return COLORS.critical;
		case "IN_PROGRESS":
		default:
			return event.COLORS.neutral;
		}
	})(event.COLORS);

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
		color, author_name, title, title_link, fields,
		fallback: `${project} ${buildStatus}`,
	});
};
