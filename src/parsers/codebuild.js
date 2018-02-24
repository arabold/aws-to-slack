"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class CodeBuildParser {

	parse(event) {
		return BbPromise.try(() => _.isObject(event) ? event : JSON.parse(event))
		.catch(_.noop) // ignore JSON errors
		.then(event => {
			if (_.get(event, "source") !== "aws.codebuild") {
				return BbPromise.resolve(false);
			}

			const time = new Date(_.get(event, "time"));
			const buildStatus = _.get(event, "detail.build-status");
			const project = _.get(event, "detail.project-name");
			const logsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${event.region}#logEventViewer:group=/aws/codebuild/${project};start=PT5M`;
			const projectUrl = `https://console.aws.amazon.com/codebuild/home?region=${event.region}#/projects/${project}/view`;
			const fields = [];

			let color = Slack.COLORS.neutral;
			let title = project;
			if (buildStatus === "SUCCEEDED") {
				title = `<${projectUrl}|${project}> has finished building`;
				color = Slack.COLORS.ok;
			}
			else if (buildStatus === "STOPPED") {
				title = `<${projectUrl}|${project}> was stopped`;
				color = Slack.COLORS.warning;
			}
			else if (buildStatus === "FAILED") {
				title = `<${projectUrl}|${project}> has failed to build`;
				color = Slack.COLORS.critical;
			}
			else if (buildStatus === "IN_PROGRESS") {
				title = `<${projectUrl}|${project}> has started building`;
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

			const slackMessage = {
				attachments: [{
					author_name: "Amazon CodeBuild",
					fallback: `${project} ${buildStatus}`,
					color: color,
					title: title,
					fields: fields,
					mrkdwn_in: [ "title", "text" ],
					ts: Slack.toEpochTime(time)
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = CodeBuildParser;
