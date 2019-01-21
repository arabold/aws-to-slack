"use strict";

const _ = require("lodash"),
	SNSParser = require("./sns"),
	Slack = require("../slack");

class CodePipelineApprovalParser extends SNSParser {

	handleMessage(message) {
		// Check that this is a CodePipeline APPROVAL message
		if (!_.has(message, "approval.pipelineName") || !_.has(message, "consoleLink")) {
			return false;
		}

		const consoleLink = message.consoleLink;
		const approval = message.approval;
		const pipeline = approval.pipelineName;
		const stage = approval.stageName;
		const action = approval.actionName;
		const expires = new Date(approval.expires);
		const reviewLink = approval.externalEntityLink;
		const approveLink = approval.approvalReviewLink;
		const customMsg = approval.customData;
		const time = new Date(this.getTimestamp());
		const numHours = Math.floor((expires - time) / 60 / 60);
		const accountId = this.getAccountId();

		let hrs;
		if (numHours < 0.001) {
			// expired
			hrs = `*${Math.ceil(numHours)} ago!*`;
		}
		else if (numHours < 1) {
			// almost expired
			hrs = `with *${Math.round(numHours*60)} minutes*`;
		}
		else {
			// in X hours
			hrs = `within ${Math.ceil(numHours)} hours`;
		}

		let text = `*APPROVAL REQUIRED* ${hrs} for ${stage}${action}`;
		if (customMsg) {
			text += `\n_${text}_`;
		}

		return {
			attachments: [{
				author_name: `AWS CodePipeline (${accountId})`,
				title: `${pipeline}`,
				title_link: consoleLink,
				text,
				fallback: `${pipeline} >> APPROVAL REQUIRED: ${approveLink}`,
				color: Slack.COLORS.warning,
				mrkdwn: true,
				ts: Slack.toEpochTime(time),
				fields: [{
					title: "Review URL",
					value: reviewLink,
					short: true
				}, {
					title: "Approval URL",
					value: approveLink,
					short: true
				}
				/*, {
					title: "Approve By",
					value: expires,
					short: true
				}*/],
			}]
		};
	}
}

module.exports = CodePipelineApprovalParser;
