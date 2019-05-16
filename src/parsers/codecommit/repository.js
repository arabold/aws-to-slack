"use strict";

const AWS = require('aws-sdk');
let codecommit = new AWS.CodeCommit({apiVersion:'2015-04-13'});

const _ = require("lodash"),
Slack = require("../../slack");

let getMessage = (repoName, branchName) => {
	return new Promise ((resolve,reject) => {
		codecommit.getBranch({
			branchName: branchName,
			repositoryName: repoName
		},(err,response) => {
			if (err) {
				reject(err);
			} else {
				let lastCommitID = response.branch.commitId;
				codecommit.getCommit({
					repositoryName: repoName,
					commitId: lastCommitID
				}, (err2, response2) => {
					if (err2) {
						reject(err2);
					} else {
						resolve(response2.commit.message);
					}
				});
			}
		});
	});
};

class CodeCommitRepositoryParser {

	parse(event) {
		if (_.get(event, "source") !== "aws.codecommit") {
			return false;
		}

		if (_.get(event, "detail-type") !== "CodeCommit Repository State Change") {
			// Not of interest for us
			return false;
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
		let getText = false;

		if (repoEvent === "referenceCreated" && refType === "branch") {
			title = `New branch created in repository ${repoName}`;
			getText = true;
		}
		else if (repoEvent === "referenceUpdated" && refType === "branch") {
			title = `New commit pushed to repository ${repoName}`;
			getText = true;
		}
		else if (repoEvent === "referenceDeleted" && refType === "branch") {
			title = `Deleted branch in repository ${repoName}`;
			getText = true;
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
		if (getText) {
			getMessage(repoName,refName)
				.then((msg) => {
					return {
						attachments: [{
							author_name: "AWS CodeCommit",
							fallback: `${repoName}: ${title}`,
							color: color,
							title: title,
							title_link: repoUrl,
							text: msg,
							fields: fields,
							mrkdwn_in: ["title", "text"],
							ts: Slack.toEpochTime(time)
						}]
					};
				})
				.catch((err) => {
					return {
						attachments: [{
							author_name: "AWS CodeCommit",
							fallback: `${repoName}: ${title}`,
							color: color,
							title: title,
							title_link: repoUrl,
							text: "Could not get message.",
							fields: fields,
							mrkdwn_in: ["title", "text"],
							ts: Slack.toEpochTime(time)
						}]
					};
				});
		} else {
			return {
				attachments: [{
					author_name: "AWS CodeCommit",
					fallback: `${repoName}: ${title}`,
					color: color,
					title: title,
					title_link: repoUrl,
					fields: fields,
					mrkdwn_in: ["title", "text"],
					ts: Slack.toEpochTime(time)
				}]
			};
		}

	}
}

module.exports = CodeCommitRepositoryParser;
