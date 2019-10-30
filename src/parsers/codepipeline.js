//
// AWS CodePipeline event parser
//
exports.matches = event =>
	event.getSource() === "codepipeline"
	&& !_.has(event.message, "approval.pipelineName");

exports.parse = event => {
	const pipeline = event.get("detail.pipeline", "<missing-pipeline>");
	const state = event.get("detail.state");
	const type = event.get("detail-type");
	const execId = event.get("detail.execution-id");
	const stage = event.get("detail.stage", "UNKNOWN");
	const action = event.get("detail.action", "UNKNOWN");
	const fields = [];

	const title_link = event.consoleUrl(`/codepipeline/home#/view/${pipeline}`);
	let author_name = "AWS CodePipeline";
	let text = type;

	const accountId = event.getAccountId();
	if (accountId) {
		author_name = `AWS CodePipeline (${accountId})`;
	}

	let title;
	const r = /(\w+) Execution State Change/.test(type) ? RegExp.$1 : "?";
	if (r === "Action") {
		const typeProvider = event.get("detail.type.provider");
		const typeCategory = event.get("detail.type.category");
		title = `${pipeline} [Action: ${stage}/${action}] >> ${state}`;
		text = `ExecID ${execId} is now ${state} at Action ${stage}/${action} (type: ${typeProvider} / ${typeCategory})`;
	}
	else if (r === "Stage") {
		title = `${pipeline} [Stage: ${stage}] >> ${state}`;
		text = `ExecID ${execId} is now ${state} at Stage ${stage}`;
	}
	else {
		title = `${pipeline} >> ${state}`;
	}

	const color = (COLORS => {
		switch (state) {
		//case "RESUMED":
		//case "SUPERSEDED":
		case "STARTED":
			return COLORS.accent;
		case "SUCCEEDED":
			return COLORS.ok;
		case "FAILED":
			return COLORS.critical;
		case "CANCELLED":
			return COLORS.warning;
		default:
			return COLORS.neutral;
		}
	})(event.COLORS);

	return event.attachmentWithDefaults({
		fallback: `${pipeline} >> ${state}`,
		author_name, color, title, title_link, text, fields,
	});
};
