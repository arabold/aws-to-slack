//
// AWS Auto-Scaling event parser
//
exports.matches = event =>
	_.has(event.message, "AutoScalingGroupARN");

exports.parse = event => {
	const accountId = event.get("AccountId");
	//const requestId = event.get("RequestId");
	const arn = event.get("AutoScalingGroupARN");
	const groupName = event.get("AutoScalingGroupName");
	const service = event.get("Service");
	const eventName = event.get("Event");

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
};
