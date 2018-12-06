"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class CodePipelineParser {

	parse(event) {
		return BbPromise.try(() => _.isObject(event) ? event : JSON.parse(event))
		.catch(_.noop) // ignore JSON errors
		.then(event => {
			if (_.get(event, "source") !== "aws.codepipeline") {
				return BbPromise.resolve(false);
			}

			const time = new Date(_.get(event, "time"));
			const buildStatus = _.get(event, "detail.state");
			const project = _.get(event, "detail.pipeline");
			const projectUrl = `https://${event.region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${project}/view`
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
				title: "View Project",
				value: `<${projectUrl}|View>`,
				short: true
			});

			const slackMessage = {
				attachments: [{
					author_name: "Amazon CodePipeline",
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

module.exports = CodePipelineParser;
