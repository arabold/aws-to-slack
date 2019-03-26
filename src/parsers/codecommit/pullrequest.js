const _ = require("lodash");

module.exports = {

	// CodeCommit: Pull Request
	matches: event =>
		event.getSource() === "codecommit"
		&& _.get(event.message, "detail-type") === "CodeCommit Pull Request State Change",

	parse: event => {
		const message = event.message;
		const callerArn = _.get(message, "detail.callerUserArn");
		const repoName = _.get(message, "detail.repositoryNames[0]");
		const pullRequestId = _.get(message, "detail.pullRequestId");
		const pullRequestEvent = _.get(message, "detail.event");
		const pullRequestMerged = _.get(message, "detail.isMerged");
		const pullRequestStatus = _.get(message, "detail.pullRequestStatus");
		const pullRequestTitle = _.get(message, "detail.title");
		const pullRequestUrl = `https://console.aws.amazon.com/codecommit/home?region=${message.region}#/repository/${repoName}/pull-request/${pullRequestId}`;
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
	}
};
