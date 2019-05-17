//
// AWS CodePipeline Approval Stage parser
//
exports.matches = event =>
	_.has(event.message, "consoleLink")
	&& _.has(event.message, "approval.pipelineName");

exports.parse = event => {
	const consoleLink = event.get("consoleLink");
	const approval = event.get("approval", {});
	const pipeline = approval.pipelineName;
	const stage = approval.stageName;
	const action = approval.actionName;
	const reviewLink = approval.externalEntityLink;
	const approveLink = approval.approvalReviewLink;
	const customMsg = approval.customData;
	const expires = new Date(approval.expires);
	const numHours = Math.floor((expires - event.getTime()) / 60 / 60);
	const accountId = event.getAccountId();

	let hrs;
	if (numHours < 0.001) {
		hrs = `*${Math.ceil(numHours)} ago!*`;
	}
	else if (numHours < 1) {
		hrs = `within *${Math.round(numHours * 60)} minutes*`;
	}
	else if (numHours < 40) {
		hrs = `within ${Math.ceil(numHours)} hours`;
	}
	else {
		hrs = `within ${Math.ceil(numHours/24)} days`;
	}

	let text = `Approval required ${hrs} for ${stage} / ${action}`;
	if (customMsg) {
		text += `\n_${text}_`;
	}

	return event.attachmentWithDefaults({
		author_name: `AWS CodePipeline (${accountId})`,
		title: `${pipeline}`,
		title_link: consoleLink,
		text,
		fallback: `${pipeline} >> APPROVAL REQUIRED`,
		color: event.COLORS.warning,
		mrkdwn: true,
		fields: [{
			title: "Review URL",
			value: reviewLink,
			short: true
		}, {
			title: "Approval URL",
			value: approveLink,
			short: true
		}],
	});
};
