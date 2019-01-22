"use strict";

const _ = require("lodash"),
	SNSParser = require("./sns"),
	Slack = require("../slack");

class CodePipelineParser extends SNSParser {

	handleMessage(message) {
		// Check that this is a CodePipeline message
		if (!_.has(message, "source") || message.source !== "aws.codepipeline") {
			return false;
		}
		// Check that this is NOT an approval message (there is a separate handler for those...)
		// NOTE: CodePipeline Action Execution State Changes that are APPROVALs are handled here,
		//       only ignore the dedicated Approval request notifications
		if (_.has(message, "approval") && _.has(message, "consoleLink")) {
			return false;
		}

		const consoleLink = _.get(message, "consoleLink");
		const typeProvider = _.get(message, "detail.type.provider");
		const typeCategory = _.get(message, "detail.type.category");
		const pipeline = _.get(message, "detail.pipeline", "<missing-pipeline>");
		const stage = _.get(message, "detail.stage", "UNKNOWN");
		const action = _.get(message, "detail.action", "UNKNOWN");
		const state = _.get(message, "detail.state");
		const ts = Slack.toEpochTime(new Date(message.time));

		// Compose the title based upon the best "one line" summary of the state
		let title = pipeline + " >> ";
		if (typeProvider === "Manual" && typeCategory === "Approval") {
			title += "APPROVAL REQUIRED for " + stage;
		}

		const accountId = this.getAccountId();
		const region = this.getRegion();
		const title_link = `https://console.aws.amazon.com/codepipeline/home?region=${region}#/view/${pipeline}`;

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

		const text = `To approve/deny this request, *<${consoleLink}|visit the console>*.`;

		return {
			attachments: [{
				fallback: `${pipeline} >> ${stage} is ${state}`,
				author_name: `AWS CodePipeline (${accountId})`,
				mrkdwn_in: [ "text" ],
				color, ts, title, title_link, text,
				fields: [{
					title: "Stage",
					value: stage,
					short: true
				}, {
					title: "Action",
					value: action,
					short: true
				}, {
					title: "State",
					value: state,
					short: true
				}],
			}]
		};
	}
}

module.exports = CodePipelineParser;