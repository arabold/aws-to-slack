//
// AWS Auto-Scaling event parser
//
const _ = require("lodash");

module.exports = {

	matches: event => _.has(event.message, "AutoScalingGroupARN"),

	parse: event => {
		const message = event.message;
		const accountId = _.get(message, "AccountId");
		//const requestId = _.get(message, "RequestId");
		const arn = _.get(message, "AutoScalingGroupARN");
		const groupName = _.get(message, "AutoScalingGroupName");
		const service = _.get(message, "Service");
		const eventName = _.get(message, "Event");

		// Example ARN: arn:aws:autoscaling:{region}:{accountId}:autoScalingGroup:{group-id}:autoScalingGroupName/{group-name}
		const arnParts = _.split(arn, ":");
		let region;
		if (arnParts.length >= 0) {
			region = arnParts[3];
		}

		const signInLink = `https://${accountId}.signin.aws.amazon.com/console/ec2?region=${region}`;
		const consoleLink = `https://console.aws.amazon.com/ec2/autoscaling/home?region=${region}#AutoScalingGroups:id=${groupName}`;

		const text = `Auto Scaling triggered ${eventName} for service ${service}.`;

		return event.attachmentWithDefaults({
			author_name: `AWS AutoScaling (${region} - ${accountId})`,
			author_link: signInLink,
			title: `${groupName} - ${eventName}`,
			title_link: consoleLink,
			text,
			fallback: text,
			color: event.COLORS.neutral,
			fields: [{
				title: "Service",
				value: service,
				short: true,
			}, {
				title: "Event",
				value: eventName,
				short: true,
			}]
		});
	}
};
