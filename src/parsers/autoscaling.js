"use strict";

const _ = require("lodash"),
	SNSParser = require("./sns"),
	Slack = require("../slack");

class AutoScalingParser extends SNSParser {

	handleMessage(message) {
		if (!_.has(message, "AutoScalingGroupARN")) {
			// Not of interest for us
			return false;
		}

		// AWS Health Dashboard Message
		const accountId = _.get(message, "AccountId");
		//const requestId = _.get(message, "RequestId");
		const arn = _.get(message, "AutoScalingGroupARN");
		const groupName = _.get(message, "AutoScalingGroupName");
		const service = _.get(message, "Service");
		const eventName = _.get(message, "Event");
		const time = _.get(message, "Time");

		// Example ARN: arn:aws:autoscaling:{region}:{accountId}:autoScalingGroup:{group-id}:autoScalingGroupName/{group-name}
		const arnParts = _.split(arn, ":");
		let region;
		if (arnParts.length >= 0) {
			region = arnParts[3];
		}

		const signInLink = `https://${accountId}.signin.aws.amazon.com/console/ec2?region=${region}`;
		const consoleLink = `https://console.aws.amazon.com/ec2/autoscaling/home?region=${region}#AutoScalingGroups:id=${groupName}`;

		const text = `Auto Scaling triggered ${eventName} for service ${service}.`;

		return {
			attachments: [{
				author_name: `AWS AutoScaling (${region} - ${accountId})`,
				author_link: signInLink,
				title: `${groupName} - ${eventName}`,
				title_link: consoleLink,
				text,
				fallback: text,
				color: Slack.COLORS.neutral,
				ts: Slack.toEpochTime(time ? new Date(time) : new Date()),
				fields: [{
					title: "Service",
					value: service,
					short: true,
				}, {
					title: "Event",
					value: eventName,
					short: true,
				}]
			}]
		};
	}
}

module.exports = AutoScalingParser;
