"use strict";

const _ = require("lodash"),
	Slack = require("../slack");

class CodeBuildParser {

	parse(event) {
		if (_.get(event, "source") !== "aws.codebuild") {
			// Not of interest for us
			return false;
		}

		const time = new Date(_.get(event, "time"));
		const buildStatus = _.get(event, "detail.build-status");
		const project = _.get(event, "detail.project-name");
		const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${event.region}#logEventViewer:group=/aws/codebuild/${project};start=PT5M`;
		const buildId = _.split(_.get(event, "detail.build-id"), ":").pop();
		const buildUrl = `https://console.aws.amazon.com/codebuild/home?region=${event.region}#/builds/${encodeURIComponent(project + ":" + buildId)}/view/new`;
		const fields = [];

		let color = Slack.COLORS.neutral;
		let title = project;
		if (buildStatus === "SUCCEEDED") {
			title = `<${buildUrl}|${project}> has finished building`;
			color = Slack.COLORS.ok;
		}
		else if (buildStatus === "STOPPED") {
			title = `<${buildUrl}|${project}> was stopped`;
			color = Slack.COLORS.warning;
		}
		else if (buildStatus === "FAILED") {
			title = `<${buildUrl}|${project}> has failed to build`;
			color = Slack.COLORS.critical;
		}
		else if (buildStatus === "IN_PROGRESS") {
			title = `<${buildUrl}|${project}> has started building`;
		}

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

		return {
			attachments: [{
				author_name: "Amazon CodeBuild",
				fallback: `${project} ${buildStatus}`,
				color: color,
				title: title,
				fields: fields,
				mrkdwn_in: ["title", "text"],
				ts: Slack.toEpochTime(time)
			}]
		};
	}
}

module.exports = CodeBuildParser;
