"use strict";

const _ = require("lodash"),
	SNSParser = require("./sns"),
	Slack = require("../slack");

// Status codes from <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html#w2ab1c15c15c17c11>
const statusMappings = {
	"CREATE_COMPLETE": {
		"title": "Stack creation complete",
		"color": Slack.COLORS.ok,
	},
	"CREATE_IN_PROGRESS": {
		"title": "Stack creation in progress",
		"color": Slack.COLORS.accent,
	},
	"CREATE_FAILED": {
		"title": "Stack creation failed",
		"color": Slack.COLORS.critical,
	},
	"DELETE_COMPLETE": {
		"title": "Stack deletion complete",
		"color": Slack.COLORS.ok,
	},
	"DELETE_FAILED": {
		"title": "Stack deletion failed",
		"color": Slack.COLORS.critical,
	},
	"DELETE_IN_PROGRESS": {
		"title": "Stack deletion in progress",
		"color": Slack.COLORS.accent,
	},
	"REVIEW_IN_PROGRESS": {
		"title": "Stack review in progress",
		"color": Slack.COLORS.accent,
	},
	"ROLLBACK_COMPLETE": {
		"title": "Stack rollback complete",
		"color": Slack.COLORS.warning,
	},
	"ROLLBACK_FAILED": {
		"title": "Stack rollback failed",
		"color": Slack.COLORS.critical,
	},
	"ROLLBACK_IN_PROGRESS": {
		"title": "Stack rollback in progress",
		"color": Slack.COLORS.warning,
	},
	"UPDATE_COMPLETE": {
		"title": "Stack update complete",
		"color": Slack.COLORS.ok,
	},
	"UPDATE_COMPLETE_CLEANUP_IN_PROGRESS": {
		"title": "Stack update complete, cleanup in progress",
		"color": Slack.COLORS.accent,
	},
	"UPDATE_IN_PROGRESS": {
		"title": "Stack update in progress",
		"color": Slack.COLORS.accent,
	},
	"UPDATE_ROLLBACK_COMPLETE": {
		"title": "Stack update rollback complete",
		"color": Slack.COLORS.warning,
	},
	"UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS": {
		"title": "Stack update rollback complete, cleanup in progress",
		"color": Slack.COLORS.warning,
	},
	"UPDATE_ROLLBACK_FAILED": {
		"title": "Stack update rollback failed",
		"color": Slack.COLORS.critical,
	},
	"UPDATE_ROLLBACK_IN_PROGRESS": {
		"title": "Stack update rollback in progress",
		"color": Slack.COLORS.warning,
	},
};

class CloudFormationParser extends SNSParser {

	handleMessage(message) {
		if (!_.startsWith(this.getSubject(), "AWS CloudFormation Notification")) {
			// Not of interest for us
			return false;
		}

		// Split the incoming message into individual fields for easier parsing
		const lines = _.split(message, "\n");
		const messageObj = _.reduce(lines, (returnObj, line) => {
			if (!_.isEmpty(line) && _.includes(line, "=")) {
				const key = _.trim(line.substr(0, line.indexOf("=")));
				const value = _.trim(line.substr(key.length + 1), "'");
				return _.extend(returnObj, { [key]: value });
			}
			return returnObj;
		}, {});

		if (!_.has(messageObj, "LogicalResourceId") || !_.has(messageObj, "StackName")) {
			// Doesn't seem like we can parse this - so not of interest for us
			return false;
		}

		const logicalResourceId = _.get(messageObj, "LogicalResourceId");
		const stackName = _.get(messageObj, "StackName");

		if (logicalResourceId !== stackName) {
			// Message is about a resource in the stack, not the stack itself,
			// so return an empty map (matched, but ignored event)
			return {};
		}

		const resourceStatus = _.get(messageObj, "ResourceStatus");
		const stackId = _.get(messageObj, "StackId");
		const time = _.get(messageObj, "Timestamp");
		const title = _.get(statusMappings, `${resourceStatus}.title`);
		const color = _.get(statusMappings, `${resourceStatus}.color`);

		// Example StackId: arn:aws:cloudformation:{region}:{accountId}:stack/${stackName}/{stackUuid}
		const stackIdParts = _.split(stackId, ":");
		let region = "us-east-1";
		if (stackIdParts.length >= 0) {
			region = stackIdParts[3];
		}

		const encodedStackId = encodeURIComponent(stackId);
		const consoleLink = `https://console.aws.amazon.com/cloudformation/home?region=${region}#stacks/${encodedStackId}/events`;

		return {
			attachments: [{
				author_name: "AWS CloudFormation",
				title: title,
				title_link: consoleLink,
				fallback: `${stackName}: ${title}`,
				color: color,
				ts: Slack.toEpochTime(new Date(time)),
				fields: [{
					title: "Stack Name",
					value: stackName,
					short: true,
				}, {
					title: "Status",
					value: resourceStatus,
					short: true,
				}]
			}]
		};
	}
}

module.exports = CloudFormationParser;
