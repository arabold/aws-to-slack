//
// AWS CodePipeline event parser
//
module.exports.matches = event =>
	event.getSource() === "codepipeline"
	&& !_.has(event.message, "approval.pipelineName");

module.exports.parse = event => {
	const message = event.message;
	const pipeline = _.get(message, "detail.pipeline", "<missing-pipeline>");
	const state = _.get(message, "detail.state");
	const type = _.get(message, "detail-type");
	const execId = _.get(message, "detail.execution-id");
	const stage = _.get(message, "detail.stage", "UNKNOWN");
	const action = _.get(message, "detail.action", "UNKNOWN");
	const fields = [];

	const region = event.getRegion();
	const title_link = `https://console.aws.amazon.com/codepipeline/home?region=${region}#/view/${pipeline}`;
	let author_name = "AWS CodePipeline";
	let text = type;

	const accountId = event.getAccountId();
	if (accountId) {
		author_name = `AWS CodePipeline (${accountId})`;
	}

	let title;
	const r = /(\w+) Execution State Change/.test(type) ? RegExp.$1 : "?";
	if (r === "Action") {
		const typeProvider = _.get(message, "detail.type.provider");
		const typeCategory = _.get(message, "detail.type.category");
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
