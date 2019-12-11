//
// AWS CodeBuild events
//
exports.matches = event =>
	event.getSource() === "codebuild";

exports.parse = event => {
	const buildStatus = event.get("detail.build-status");
	const project = event.get("detail.project-name");
	const buildId = _.split(event.get("detail.build-id"), ":").pop();
	const buildUrl = event.consoleUrl(`/codesuite/codebuild/projects/${project}/build/${encodeURIComponent(project + ":" + buildId)}/`);

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

	const logLink = event.getLink(
		"View Logs",
		event.consoleUrl(`/cloudwatch/home#logEventViewer:group=/aws/codebuild/${project};start=PT5M`)
	);
	if (logLink.willPrintLink) {
		fields.push({
			title: "Logs",
			value: logLink.toString(),
			short: true
		});
	}

	return event.attachmentWithDefaults({
		color, author_name, title, title_link, fields,
		fallback: `${project} ${buildStatus}`,
	});
};
