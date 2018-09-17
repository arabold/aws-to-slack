"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../../slack");

class CodeCommitPullRequestParser {

	parse(event) {
		return BbPromise.try(() => _.isObject(event) ? event : JSON.parse(event))
		.catch(_.noop) // ignore JSON errors
		.then(event => {
			if (_.get(event, "source") !== "aws.codecommit") {
				return BbPromise.resolve(false);
			}

			if (_.get(event, "detail-type") !== "CodeCommit Pull Request State Change") {
				// Not of interest for us
				return BbPromise.resolve(false);
			}

			const time = new Date(_.get(event, "time"));
			const repoName = _.get(event, "detail.repositoryNames[0]");
			const callerArn = _.get(event, "detail.callerUserArn");
			const pullRequestId = _.get(event, "detail.pullRequestId");
			const pullRequestEvent = _.get(event, "detail.event");
			const pullRequestMerged = _.get(event, "detail.isMerged");
			const pullRequestStatus = _.get(event, "detail.pullRequestStatus");
			const pullRequestTitle = _.get(event, "detail.title");
			const pullRequestUrl = `https://console.aws.amazon.com/codecommit/home?region=${event.region}#/repository/${repoName}/pull-request/${pullRequestId}`;
			const fields = [];

			let color = Slack.COLORS.neutral;
			const baseTitle = `Pull Request #${pullRequestId}`;
			let title = baseTitle;
			if (pullRequestEvent === "pullRequestMergeStatusUpdated" && pullRequestStatus === "Closed" && pullRequestMerged === "True") {
				title = `${baseTitle} was merged`;
				color = Slack.COLORS.accent;
			}
			else if (pullRequestEvent === "pullRequestStatusChanged" && pullRequestStatus === "Closed" && pullRequestMerged === "False") {
				title = `${baseTitle} was closed`;
				color = Slack.COLORS.critical;
			}
			else if (pullRequestEvent === "pullRequestCreated") {
				title = `${baseTitle} was opened`;
				color = Slack.COLORS.ok;
			}
			else if (pullRequestEvent === "pullRequestSourceBranchUpdated") {
				title = `${baseTitle} source branch was updated`;
				color = Slack.COLORS.warning;
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

			const slackMessage = {
				attachments: [{
					author_name: "AWS CodeCommit",
					fallback: `${repoName}: ${title}`,
					color: color,
					title: title,
					title_link: pullRequestUrl,
					fields: fields,
					mrkdwn_in: [ "title", "text" ],
					ts: Slack.toEpochTime(time)
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = CodeCommitPullRequestParser;
