"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class CodePipelineParser {

	parse(event) {
		return BbPromise.try(() => 
			JSON.parse(_.get(event, "Records[0].Sns.Message", "{}")))
		.catch(_.noop) // ignore JSON errors
		.then(message => {

			// Check that this is a CodePipeline message
			if (!_.has(message, "source") || message.source != "aws.codepipeline") {
				return BbPromise.resolve(false);
			}

			// Check that this is NOT an approval message (there is a separate handler for those...)
			// NOTE: CodePipeline Action Execution State Changes that are APPROVALs are handled here, 
			//       only ignore the dedicated Approval request notifications
			if (_.has(message, "approval") && _.has(message, "consoleLink")) {
				return BbPromise.resolve(false);
			}
			
			const typeProvider = message.detail.type.provider;
			const typeCategory = message.detail.type.category;
			const pipeline = message.detail.pipeline;
			const stage = message.detail.stage;
			const action = message.detail.action;
			const state = message.detail.state;
			const time = new Date(message.time);
			
			// Compose the title based upon the best "one line" summary of the state
			let slackTitle = pipeline + " >> ";
			if(typeProvider == "Manual" && typeCategory == "Approval") {
				slackTitle += "APPROVAL REQUIRED for " + stage;
			}


			let color = Slack.COLORS.neutral;
			switch(state) {
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
			
			const slackMessage = {
				attachments: [{
					fallback: `${pipeline} >> ${stage} is ${state}`,
					color: color,
					author_name: "AWS CodePipeline",
					title: slackTitle,
					text: message,
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
					ts: Slack.toEpochTime(time)
				}]
			};

			return slackMessage;

		});
	}
}

module.exports = CodePipelineParser;
