"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class CodePipelineApprovalParser {

	parse(event) {
		//console.log("CodePipeline.Approval :: start...");
		//console.log(_.get(event, "Records[0].Sns.Message", "{}"));
		return BbPromise.try(() => 
			JSON.parse(_.get(event, "Records[0].Sns.Message", "{}")))
		.catch(_.noop) // ignore JSON errors
		.then(message => {

			// Check that this is a CodePipeline APPROVAL message
			if (!_.has(message, "approval") || !_.has(message, "consoleLink")) {
				return BbPromise.resolve(false);
			}
			
			console.log("  this IS an APPROVAL message");
			
			const pipeline = message.approval.pipelineName;
			const stage = message.approval.stageName;
			// const action = message.approval.actionName;
			// const expires = new Date(message.approval.expires);
			const reviewLink = message.approval.externalEntityLink;
			const approveLink = message.approval.approvalReviewLink;
			const customMsg = message.approval.customData;
			const time = new Date(_.get(event, "Records[0].Sns.Timestamp"));
			
			const slackTitle = pipeline + " >> APPROVAL REQUIRED for " + stage;

			const slackMessage = {
				attachments: [{
					fallback: `${pipeline} >> APPROVAL REQUIRED: ${approveLink}`,
					color: Slack.COLORS.warning,
					author_name: "AWS CodePipeline :: APPROVAL REQUIRED",
					title: slackTitle,
					text: customMsg,
					fields: [{
						title: "Review Link",
						value: reviewLink,
						short: true
					}, {
						title: "Approval Link",
						value: approveLink,
						short: true
					}
					/*
					, {
						title: "Approve By",
						value: expires,
						short: true
					}
					*/],
					ts: Slack.toEpochTime(time)
				}]
			};

			return slackMessage;

		});
	}
}

module.exports = CodePipelineApprovalParser;
