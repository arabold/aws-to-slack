//
// AWS CloudFormation event parser
//
exports.matches = event =>
	// Will only match SNS messages
	_.startsWith(event.getSubject(), "AWS CloudFormation Notification");

exports.parse = event => {
	// Split the incoming message into individual fields for easier parsing
	const lines = _.split(event.message, "\n");
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
		// Message is about a resource in the stack, not the stack itself
		// Ignore by returning truthy but empty message
		return true;
	}

	const resourceStatus = _.get(messageObj, "ResourceStatus");
	const stackId = _.get(messageObj, "StackId");
	const time = _.get(messageObj, "Timestamp");
	const title = _.get(statusMappings, `${resourceStatus}.title`);
	const color = _.get(statusMappings, `${resourceStatus}.color`);

	// Example StackId: arn:aws:cloudformation:{region}:{accountId}:stack/${stackName}/{stackUuid}
	const region = event.parseArn(stackId).region || event.getRegion();
	const encodedStackId = encodeURIComponent(stackId);
	const consoleLink = event.consoleUrl(`/cloudformation/home?region=${region}#stacks/${encodedStackId}/events`);

	return event.attachmentWithDefaults({
		author_name: "AWS CloudFormation",
		title: title,
		title_link: consoleLink,
		fallback: `${stackName}: ${title}`,
		color: color,
		ts: new Date(time),
		fields: [{
			title: "Stack Name",
			value: stackName,
			short: true,
		}, {
			title: "Status",
			value: resourceStatus,
			short: true,
		}]
	});
};

const COLORS = require("../eventdef").COLORS;
// Status codes from <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html#w2ab1c15c15c17c11>
const statusMappings = {
	"CREATE_COMPLETE": {
		"title": "Stack creation complete",
		"color": COLORS.ok,
	},
	"CREATE_IN_PROGRESS": {
		"title": "Stack creation in progress",
		"color": COLORS.accent,
	},
	"CREATE_FAILED": {
		"title": "Stack creation failed",
		"color": COLORS.critical,
	},
	"DELETE_COMPLETE": {
		"title": "Stack deletion complete",
		"color": COLORS.ok,
	},
	"DELETE_FAILED": {
		"title": "Stack deletion failed",
		"color": COLORS.critical,
	},
	"DELETE_IN_PROGRESS": {
		"title": "Stack deletion in progress",
		"color": COLORS.accent,
	},
	"REVIEW_IN_PROGRESS": {
		"title": "Stack review in progress",
		"color": COLORS.accent,
	},
	"ROLLBACK_COMPLETE": {
		"title": "Stack rollback complete",
		"color": COLORS.warning,
	},
	"ROLLBACK_FAILED": {
		"title": "Stack rollback failed",
		"color": COLORS.critical,
	},
	"ROLLBACK_IN_PROGRESS": {
		"title": "Stack rollback in progress",
		"color": COLORS.warning,
	},
	"UPDATE_COMPLETE": {
		"title": "Stack update complete",
		"color": COLORS.ok,
	},
	"UPDATE_COMPLETE_CLEANUP_IN_PROGRESS": {
		"title": "Stack update complete, cleanup in progress",
		"color": COLORS.accent,
	},
	"UPDATE_IN_PROGRESS": {
		"title": "Stack update in progress",
		"color": COLORS.accent,
	},
	"UPDATE_ROLLBACK_COMPLETE": {
		"title": "Stack update rollback complete",
		"color": COLORS.warning,
	},
	"UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS": {
		"title": "Stack update rollback complete, cleanup in progress",
		"color": COLORS.warning,
	},
	"UPDATE_ROLLBACK_FAILED": {
		"title": "Stack update rollback failed",
		"color": COLORS.critical,
	},
	"UPDATE_ROLLBACK_IN_PROGRESS": {
		"title": "Stack update rollback in progress",
		"color": COLORS.warning,
	},
};
