"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../../slack");

class CodeCommitRepositoryParser {

	parse(event) {
		return BbPromise.try(() => _.isObject(event) ? event : JSON.parse(event))
		.catch(_.noop) // ignore JSON errors
		.then(event => {
			if (_.get(event, "source") !== "aws.codecommit") {
				return BbPromise.resolve(false);
			}

			if (_.get(event, "detail-type") !== "CodeCommit Repository State Change") {
				// Not of interest for us
				return BbPromise.resolve(false);
			}

			const time = new Date(_.get(event, "time"));
			const callerArn = _.get(event, "detail.callerUserArn");
			const refName = _.get(event, "detail.referenceName");
			const refType = _.get(event, "detail.referenceType");
			const repoName = _.get(event, "detail.repositoryName");
			const repoEvent = _.get(event, "detail.event");
			const repoUrl = `https://console.aws.amazon.com/codecommit/home?region=${event.region}#/repository/${repoName}`;
			const fields = [];

			const color = Slack.COLORS.neutral;
			let title = repoName;
			if (repoEvent === "referenceCreated" && refType === "branch") {
				title = `New branch created in repository ${repoName}`;
			}
			else if (repoEvent === "referenceUpdated" && refType === "branch") {
				title = `New commit pushed to repository ${repoName}`;
			}
			else if (repoEvent === "referenceDeleted" && refType === "branch") {
				title = `Deleted branch in repository ${repoName}`;
			}
			else if (repoEvent === "referenceCreated" && refType === "tag") {
				title = `New tag created in repository ${repoName}`;
			}
			else if (repoEvent === "referenceUpdated" && refType === "tag") {
				title = `Tag reference modified in repository ${repoName}`;
			}
			else if (repoEvent === "referenceDeleted" && refType === "tag") {
				title = `Deleted tag in repository ${repoName}`;
			}

			if (repoName) {
				fields.push({
					title: "Repository",
					value: repoName,
					short: true,
				});
			}

			if (refType) {
				fields.push({
					title: _.toUpper(refType.charAt(0)) + refType.slice(1),
					value: refName,
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
					title_link: repoUrl,
					fields: fields,
					mrkdwn_in: [ "title", "text" ],
					ts: Slack.toEpochTime(time)
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = CodeCommitRepositoryParser;
