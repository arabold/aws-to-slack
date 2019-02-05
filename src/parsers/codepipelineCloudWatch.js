"use strict";

const _ = require("lodash"),
	Slack = require("../slack");

class CodePipelineCloudWatchParser {

	parse(event) {
		// Check that this is a CodePipeline message
		if (!_.has(event, "source") || event.source !== "aws.codepipeline") {
			return false;
		}

		const detailType = _.get(event, "detail-type");
		const pipeline = _.get(event, "detail.pipeline", "<missing-pipeline>");
		const state = _.get(event, "detail.state");
		const ts = Slack.toEpochTime(new Date(event.time));
		const title = pipeline + " >> " + state;
		let title_link = `https://console.aws.amazon.com/codepipeline/home?#/view/${pipeline}`;
		let author_name = "AWS CodePipeline";

		const arn = _.get(event, "resources[0]");
		if (arn) {
			const parts = _.split(arn, ":");
			const accountId = parts[4];
			const region = parts[3];
			title_link = `https://console.aws.amazon.com/codepipeline/home?region=${region}#/view/${pipeline}`;
			author_name = `AWS CodePipeline (${accountId})`;
		}

		let color = Slack.COLORS.neutral;
		switch (state) {
		//case "RESUMED":
		//case "SUPERSEDED":
		case "STARTED":
			color = Slack.COLORS.accent;
			break;
		case "SUCCEEDED":
			color = Slack.COLORS.ok;
			break;
		case "FAILED":
			color = Slack.COLORS.critical;
			break;
		case "CANCELLED":
			color = Slack.COLORS.warning;
			break;
		}

		return {
			attachments: [{
				fallback: `${pipeline} >> ${state}`,
				author_name, color, ts, title, title_link,
				text: detailType,
				footer: "Received via CloudWatch",
			}]
		};
	}
}

module.exports = CodePipelineCloudWatchParser;