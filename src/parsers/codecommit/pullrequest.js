//
// AWS CodeCommit: Pull Request event
//
exports.matches = event =>
	event.getSource() === "codecommit"
	&& _.get(event.message, "detail-type") === "CodeCommit Pull Request State Change";

exports.parse = event => {
	const callerArn = event.get("detail.callerUserArn");
	const repoName = event.get("detail.repositoryNames[0]");
	const pullRequestId = event.get("detail.pullRequestId");
	const pullRequestEvent = event.get("detail.event");
	const pullRequestMerged = event.get("detail.isMerged");
	const pullRequestStatus = event.get("detail.pullRequestStatus");
	const pullRequestTitle = event.get("detail.title");
	const pullRequestUrl = `https://console.aws.amazon.com/codecommit/home?region=${event.get("region")}#/repository/${repoName}/pull-request/${pullRequestId}`;
	const fields = [];

	let color = event.COLORS.neutral;
	const baseTitle = `Pull Request #${pullRequestId}`;
	let title = baseTitle;
	if (pullRequestEvent === "pullRequestMergeStatusUpdated" && pullRequestStatus === "Closed" && pullRequestMerged === "True") {
		title = `${baseTitle} was merged`;
		color = event.COLORS.accent;
	}
	else if (pullRequestEvent === "pullRequestStatusChanged" && pullRequestStatus === "Closed" && pullRequestMerged === "False") {
		title = `${baseTitle} was closed`;
		color = event.COLORS.critical;
	}
	else if (pullRequestEvent === "pullRequestCreated") {
		title = `${baseTitle} was opened`;
		color = event.COLORS.ok;
	}
	else if (pullRequestEvent === "pullRequestSourceBranchUpdated") {
		title = `${baseTitle} source branch was updated`;
		color = event.COLORS.warning;
	}

	if (repoName) {
		fields.push({
			title: "Repository",
			value: repoName,
			short: true,
		});
	}

	if (pullRequestTitle) {
		fields.push({
			title: "Pull Request Title",
			value: pullRequestTitle,
			short: true,
		});
	}

	if (callerArn) {
		fields.push({
			title: "Caller ARN",
			value: callerArn,
		});
	}

	return event.attachmentWithDefaults({
		author_name: "AWS CodeCommit",
		fallback: `${repoName}: ${title}`,
		color: color,
		title: title,
		title_link: pullRequestUrl,
		fields: fields,
		mrkdwn_in: ["title", "text"],
	});
};
